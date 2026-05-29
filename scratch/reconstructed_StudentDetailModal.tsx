
import React, { useState, useEffect } from 'react';
import { X, Calendar, Music, Award, Star, Clock, User, Users, Shield, BookOpen, GraduationCap, LayoutDashboard, Sliders } from 'lucide-react';
import { supabase } from '../lib/supabase';
import QRCode from 'react-qr-code';
import { 
  ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts';

import { renderInstrumentIcon } from '../utils/instruments';

interface StudentDetailModalProps {
  student: any;
  onClose: () => void;
  onOpenBandProfile?: (band: any) => void;
  activePlatform?: 'secretary' | 'campus' | 'groovelab';
  onSwitchPlatform?: (newPlatform: 'campus' | 'groovelab') => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ student, onClose, onOpenBandProfile, activePlatform, onSwitchPlatform }) => {
  const [skills, setSkills] = useState<any[]>([]);
  const [bands, setBands] = useState<any[]>([]);
  const [vocalsSongIds, setVocalsSongIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showFullPhoto, setShowFullPhoto] = useState(false);
  const [sessionsList, setSessionsList] = useState<any[]>([]);
  const [planningList, setPlanningList] = useState<any[]>([]);
  const [isCampusActive, setIsCampusActive] = useState<boolean>(student.is_campus_active ?? false);
  const [isGroovelabActive, setIsGroovelabActive] = useState<boolean>(student.is_gr













    try {
      const { error } = await supabase
        .from('users')
        .update({ is_campus_active: newVal })
        .eq('id', student.id);
      if (error) throw error;
      setIsCampusActive(newVal);
      student.is_campus_active = newVal;
      if (newVal) {
        setLocalTab('campus');
      } else if (isGroovelabActive) {
        setLocalTab('groovelab');
      }
    } catch (err: any) {
      alert('Fehler beim Aktualisieren des Campus-Zugangs: ' + err.message);
    }
  };

  const handleToggleGroovelab = async (newVal: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_groovelab_active: newVal })
        .eq('id', student.id);
      if (error) throw error;
      setIsGroovelabActive(newVal);
      student.is_groovelab_active = newVal;
      if (newVal) {
        setLocalTab('groovelab');
      } else if (isCampusActive) {
        setLocalTab('campus');
      }
    } catch (err: any) {
      alert('Fehler beim Aktualisieren des GrooveLab-Zugangs: ' + err.message);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      // Fetch skills
      const { data: skillsData } = await supabase
        .from('user_song_skills')
        .select('*, songs(*)')
        .eq('user_id', student.id);
      setSkills(skillsData || []);

      // Fetch enriched bands
      const { data: bandsData } = await supabase
        .from('band_members')
        .select(`
          bands (
            *,
            band_members (
              *,
              users (*)
            ),
            band_songs (
              *,







































































































































































































          <X size={20} />
        </button>

        {/* Detail-Kartei Cross-Tab Links */}
        {onSwitchPlatform && (
          <div style={{ marginBottom: '20px', display: 'flex' }}>
            {activePlatform === 'groovelab' ? (
              <button
                onClick={() => onSwitchPlatform('campus')}
                style={{
                  background: '#22c55e',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '16px',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(34, 197, 94, 0.3)',
                  transition: 'all 0.2s',
    ? (localTab === 'campus') 
    : isCampusActive;

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      zIndex: 3000, 
      background: 'rgba(242, 242, 247, 0.65)', 
      backdropFilter: 'blur(25px)', 
      WebkitBackdropFilter: 'blur(25px)',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'
    }}>
      <div className="glass-panel animation-slide-up" style={{ 
        background: 'rgba(255, 255, 255, 0.95)', 
        backdropFilter: 'blur(50px) saturate(2.1)',
        WebkitBackdropFilter: 'blur(50px) saturate(2.1)',
        padding: '36px', 
        borderRadius: '32px', 
        maxWidth: '980px', 
        width: '100%', 
        maxHeight: '88vh', 
        overflowY: 'auto', 
        position: 'relative',
        border: '1px solid rgba(255, 255, 255, 0.8)',
        boxShadow: '0 30px 70px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)'
      }}>
        {/* Apple Style Close Button */}
        <button onClick={onClose} style={{ 
          position: 'absolute', 
          top: 24, 
          right: 24, 
          background: 'rgba(0, 0, 0, 0.05)', 
          border: 'none', 
          borderRadius: '50
          width: '30px', 
          height: '30px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          cursor: 'pointer', 
          color: '#3c3c43',
          opacity: 0.6,
          transition: 'all 0.2s ease',
          outline: 'none'
        }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}
        >
          <X size={15} strokeWidth={2.5} />
        </button>

        {/* Apple Segmented Control Style Tab Bar - only visible if BOTH active */}
        {showTabSwitch && (
          <div style={{ marginBottom: '32px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ 
              background: 'rgba(120, 120, 128, 0.12)', 
              padding: '4px', 
              borderRadius: '99px', 
              display: 'inline-flex',
              gap: '2px',
              border: '0.5px solid rgba(0,0,0,0.04)'
            }}>
              <button
                onClick={() => {
                  setLocalTab('campus');
                  if (onSwitchPlatform) {
                    onSwitchPlatform('campus');
                  }
                }}
                style={{
                  background: isPlatformCampus ? '#ffffff' : 'transparent',
                  color: isPlatformCampus ? '#000000' : '#3c3c43',
                  border: 'none',
                  padding: '6px 20px',
                  cursor: 'pointer',
                  boxShadow: isPlatformCampus ? '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <GraduationCap size={15} />
                <span>Campus</span>
              </button>
              <button
                onClick={() => {
                  setLocalTab('groovelab');
                }}
                style={{
                  background: !isPlatformCampus ? '#ffffff' : 'transparent',
                  color: !isPlatformCampus ? '#000000' : '#3c3c43',
                  border: 'none',
                  padding: '6px 20px',
                  borderRadius: '99px',
                  fontWeight: 650,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: !isPlatformCampus ? '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Music size={15} />
                <span>GrooveLab</span>
              </button>
            </div>
          </div>
        )}

        {/* Profile Card Header - Spacious & Clean iOS Widget Look */}
        <div style={{ display: 'flex', gap: '32px', marginBottom: '40px', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center', flex: '1 1 450px' }}>
            <div 
              onClick={() => setShowFullPhoto(true)}
              style={{ 
                width: '110px', 
                height: '110px', 
                borderRadius: '24px', 
                overflow: 'hidden', 
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)', 
                border: '1px solid rgba(0, 0, 0, 0.04)',
                flexShrink: 0, 
                cursor: 'pointer', 
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              className="hover-scale"
            >
              <img src={student.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <h2 style={{ 
                fontSize: '2.1rem', 
                fontWeight: 800, 
             
                margin: 0, 
                lineHeight: 1.1, 
                letterSpacing: '-0.03em' 
              }}>
                {student.first_name} {student.last_name}
              </h2>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginTop: '4px' }}>
                <span style={{ fontSize: '0.85rem', color: '#86868b', fontWeight: 500 }}>
   
                </span>
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#d2d2d7' }}></span>
                <span style={{ 
                  background: isPlatformCampus ? 'rgba(52, 168, 83, 0.08)' : 'rgba(0, 122, 255, 0.08)',
                  color: isPlatformCampus ? '#137333' : '#007aff',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 650,
                  letterSpacing: '-0.01em'
                }}>
                  {(skills.filter(s => {
                    const isVocal = (s.instrument || '').toLowerCase().includes('vocal') || (s.instrument || '').toLowerCase().includes('gesang');
                    return s.is_stage_ready && !isVocal;
                  }).length + vocalsSongIds.size) * 100} XP
                </span>
              </div>

              {/* iOS System Pill Button for Activation Status */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                {isCampusActive && (
                  <div 
                    onClick={() => {
                      setLocalTab('campus');
                    }}
                    style={{ 
                      background: 'rgba(52, 168, 83, 0.08)', 
                      padding: '4px 12px', 
                    onClick={() => {
                      setLocalTab('campus');
                      if (onSwitchPlatform) {
                        onSwitchPlatform('campus');
                      }
                    }}
                      cursor: 'pointer'
                    }}
                  >
                    🎓 Campus
                  </div>
                )}
                {isGroovelabActive && (
                  <div 
                    onClick={() => {
                      setLocalTab('groovelab');
                    }}
                    style={{ 
                      background: 'rgba(0, 122, 255, 0.08)', 
                      padding: '4px 12px', 
                      borderRadius: '99px', 
                      fontSize: '0.72rem', 
                      fontWeight: 600, 
                      color: '#007aff', 
                      letterSpacing: '0.02em',
                      border: '0.5px solid rgba(0, 122, 255, 0.12)',
                      cursor: 'pointer'
                    }}
                  >
                    🎸 GrooveLab
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Elegant Green Campus Pass on the right (horizontal Apple Wallet style) */}
          {isPlatformCampus && (
            <div className="hover-scale" style={{ 
              background: 'linear-gradient(135deg, #1e7e34 0%, #0d4b1e 100%)', 
              borderRadius: '20px', 
              padding: '18px 22px', 
              color: 'white',
              boxShadow: '0 15px 35px rgba(19, 115, 51, 0.18)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              position: 'relative',
              overflow: 'hidden',
              width: '100%',
              maxWidth: '340px',
              height: '160px',
              boxSizing: 'border-box',
              flexShrink: 0
            }}>
              {/* Glossy light effect */}
              <div style={{
                position: 'absolute',
                top: '-50%', left: '-50%', right: '-50%', bottom: '-50%',
                background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 60%)',
                pointerEvents: 'none'
              }} />

              {/* Left side details */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', flex: 1, zIndex: 1 }}>
                <div>
                  <span style={{ fontSize: '0.58rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.65)', textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block' }}>
                    Campus Pass
                  </span>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', marginTop: '6px', lineHeight: '1.2' }}>
                    {student.first_name} {student.last_name}
                  </div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 500, color: 'rgba(255, 255, 255, 0.6)', marginTop: '2px', fontFamily: 'monospace' }}>
                    ID: {student.ausweis_nummer || student.id.substring(0, 8).toUpperCase()}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.5rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Musikschule</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ffffff', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
                    {student.schools?.name || 'Campus Musikschule'}
                  </div>
                </div>
              </div>

              {/* Right side QR code */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 1 }}>
                <div style={{ background: '#ffffff', padding: '8px', borderRadius: '12px', boxShadow: '0 6px 15px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <QRCode value={student.qr_token || student.id || ''} size={76} />
                </div>
                <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: '0.08em' }}>CHECK-IN</span>
              </div>
            </div>
          )}
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff', marginTop: '1px' }}>{student.schools?.name || 'Campus Musikschule'}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '40px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {/* Stundenplan & Tageskompass Section - Clean Apple Lists */}
                <section>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1d1d1f', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.02em' }}>
                    Stundenplan & Unterricht
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'rgba(0, 0, 0, 0.04)', borderRadius: '24px', overflow: 'hidden', padding: '1px' }}>
                    {campusSchedules.map((sched: any) => (
                      <div key={sched.id} style={{ 
                        background: '#ffffff', 
                        padding: '20px 24px', 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '0.5px solid rgba(0, 0, 0, 0.04)'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '0.92rem', fontWeight: 650, color: '#1d1d1f' }}>
                            {getWeekdayName(sched.day_of_week)} • {sched.time_slot} Uhr
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#86868b', fontWeight: 500 }}>
                            🏫 {sched.rooms?.name || 'Raum'} &bull; Lehrkraft: {sched.teacher ? `${sched.teacher.first_name} ${sched.teacher.last_name}` : 'Lehrkraft'}
                          </span>
                        </div>
                        
                        <span style={{ 
                          fontSize: '0.68rem', 
                          fontWeight: 600, 
                          padding: '4px 10px', 
                          borderRadius: '99px', 
                          background: 'rgba(52, 168, 83, 0.08)', 
                          color: '#137333'
                        }}>
                          Aktiv
                        </span>
                      </div>
                    ))}
                    {campusSchedules.length === 0 && (
                      <div style={{ fontSize: '0.85rem', color: '#86868b', background: '#ffffff', padding: '24px', textAlign: 'center', fontWeight: 500 }}>
                              marginTop: '16px', 
                              fontSize: '0.82rem', 
                              lineHeight: '1.45', 
                              background: 'rgba(0, 0, 0, 0.02)', 
                              padding: '14px 18px', 
                              borderRadius: '16px', 
                              color: '#1d1d1f', 
                              fontWeight: 500,
                              border: '0.5px solid rgba(0, 0, 0, 0.02)'
                            }}>
                              {item.teacher_notes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {campusProgress.length === 0 && (
                      <div style={{ fontSize: '0.85rem', color: '#86868b', background: '#ffffff', padding: '24px', borderRadius: '24px', border: '1px solid rgba(0, 0, 0, 0.04)', textAlign: 'center' }}>
                        Noch keine Einträge in der Fortschrittsmatrix vorhanden.
                      </div>
                    )}
                  </div>
                </section>

                {/* Wochenplan / Verfügbarkeiten - Clean iOS List Section (Moved from right column) */}
                <section>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1d1d1f', marginBottom: '16px', letterSpacing: '-0.02em' }}>
                    Campus Verfügbarkeit
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'rgba(0, 0, 0, 0.04)', borderRadius: '24px', overflow: 'hidden', padding: '1px' }}>
                    {userAvailability.map((avail, idx) => (
                      <div key={idx} style={{ 
                        background: '#ffffff', 
                        padding: '16px 20px',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        color: '#1d1d1f',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '0.5px solid rgba(0, 0, 0, 0.04)'
                      }}>
                        <span style={{ color: '#86868b' }}>{getWeekdayName(avail.day_of_week)}</span>
                        <span>{avail.time_slot} Uhr</span>
                      </div>
                    ))}
                    {userAvailability.length === 0 && (
                      <div style={{ fontSize: '0.85rem', color: '#86868b', background: '#ffffff', padding: '20px', textAlign: 'center' }}>
                        Keine Verfügbarkeiten eingetragen.
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <aside style={{ display: 'flex', flex
                <section style={{ 
                  background: '#ffffff', 
                  borderRadius: '24px', 
                  padding: '24px', 
                  border: '1px solid rgba(0, 0, 0, 0.04)',
                  border: '1px solid rgba(0, 0, 0, 0.04)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.01)'
                }}>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1d1d1f', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sliders size={16} style={{ color: '#86868b' }} /> Module & Einstellungen
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                              {item.teacher_notes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {campusProgress.length === 0 && (
                      <div style={{ fontSize: '0.85rem', color: '#86868b', background: '#ffffff', padding: '24px', borderRadius: '24px', border: '1px solid rgba(0, 0, 0, 0.04)', textAlign: 'center' }}>
                        Noch keine Einträge in der Fortschrittsmatrix vorhanden.
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <aside style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {/* Module & Einstellungen - iOS Switched Settings Card */}
                <section style={{ 
                  background: '#ffffff', 
                  borderRadius: '24px', 
                  padding: '24px', 
                  border: '1px solid rgba(0, 0, 0, 0.04)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.01)'
              }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1d1d1f', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sliders size={16} style={{ color: '#86868b' }} /> Module & Einstellungen
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#1d1d1f' }}>Campus-Modul aktivieren</span>
                      <span style={{ fontSize: '0.72rem', color: '#86868b' }}>Stundenplan & meisterwerke</span>
                    </div>
                    <butto
                      onClick={() => handleToggleCampus(!isCampusActive)}
                      style={{
                        width: '46px',
                        height: '26px',
                        borderRadius: '99px',
                        background: isCampusActive ? '#34a853' : '#e5e5ea',
                        border: 'none',
                        cursor: 'pointer
                          width: '46px',
                          height: '26px',
                          borderRadius: '99px',
                          border: 'none',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'background 0.25s ease',
                          padding: 0
                        }}
                      >
                        <div style={{
                          width: '22px',
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: '#ffffff',
                          position: 'absolute',
                          top: '2px',
                          left: isGroovelabActive ? '22px' : '2px',
                          transition: 'left 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }} />
                      </button>
                    </div>
                  </div>
                </section>

                {/* Premium Digital Campus ID Card Badge - APPLE WALLET STYLE (Vertical Edition) */}
                <div className="hover-scale" style={{ 
                  background: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)', 
                  borderRadius: '24px', 
                  padding: '24px', 
                  color: 'white',
                  boxShadow: '0 20px 45px rgba(2, 44, 34, 0.25)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  position: 'relative',
                  overflow: 'hidden',
                  width: '100%',
                  minHeight: '430px',
                  boxSizing: 'border-box',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
                }}>
                  {/* Glossy light sheen overlay */}
                  <div style={{
                        left: isGroovelabActive ? '22px' : '2px',
                        transition: 'left 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                    </button>
                  </div>
                </div>
              </section>

              {/* Wochenplan / Verfügbarkeiten - Clean iOS List Section */}
              <section>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1d1d1f', marginBottom: '16px', letterSpacing: '-0.02em' }}>
                  Campus Verfügbarkeit
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'rgba(0, 0, 0, 0.04)', borderRadius: '24px', overflow: 'hidden', padding: '1px' }}>
                  {userAvailability.map((avail, idx) => (
                    <div key={idx} style={{ 
                      background: '#ffffff', 
                      padding: '16px 20px',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      color: '#1d1d1f',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '0.5px solid rgba(0, 0, 0, 0.04)'
                    }}>
                      <span style={{ color: '#86868b' }}>{getWeekdayName(avail.day_of_week)}</span>
                      <span>{avail.time_slot} Uhr</span>
                    </div>
                  ))}
                  {userAvailability.length === 0 && (
                    <div style={{ fontSize: '0.85rem', color: '#86868b', background: '#ffffff', padding: '20px', textAlign: 'center' }}>
                      Keine Verfügbarkeiten eingetragen.
                    </div>
                  )}
                </div>
              </section>
              </aside>
            </div>
          </div>
        ) : (
          // ---------------- GROOVELAB SPECIFIC VIEW (APPLE-LIKE OVERHAUL) ----------------
          <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '40px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Üben Board */}
              <section>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1d1d1f', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.02em' }}>
                  <Clock size={16} style={{ color: '#007aff' }} /> Üben Board
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {practiceBoard.map((s: any) => (
                    <div key={s.id + s.level} style={{ 
                      background: '#ffffff', 
                      padding: '20px', 
                      borderRadius: '24px', 
                      border: '1px solid rgba(0, 0, 0, 0.04)',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.01)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                  <div style={{ 
                    width: '100%', 
                    borderTop: '0.5px solid rgba(255,255,255,0.18)', 
                    paddingTop: '16px', 
                    textAlign: 'center',
                    zIndex: 1
                  }}>
                    <div style={{ fontSize: '0.55rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Musikakademie</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f59e0b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {student.schools?.name || 'Campus Musikschule'}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>























                      </div>
                    </div>

                    {/* Classic Ticket Dashed Divider Line */}
                    <div style={{ 
                      borderTop: '1px dashed rgba(255, 255, 255, 0.25)', 
                      margin: '12px 0 4px 0', 
                      width: '100%', 
                      zIndex: 1 
                    }} />
                    zIndex: 1 
                  }} />
                  
                  {/* QR Code Ticket Cutout */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', width: '100%', zIndex: 1, marginTop: 'auto' }}>
                    <div style={{ 
                      background: '#ffffff', 
                      padding: '16px', 
                      borderRadius: '20px', 
                      boxShadow: '0 12px 30px rgba(0,0,0,0.3)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      border: '1px solid rgba(255, 255, 255, 0.8)'
                    }}>
                      <QRCode value={student.qr_token || student.id || ''} size={120} />
                    </div>
                    <span style={{ 
                      fontSize: '0.58rem', 
                      color: '#fbbf24', 
                      fontWeight: 800, 
                      letterSpacing: '0.15em',
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                    }}>
                      TICKER SCAN TO CHECK IN
                    </span>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        ) : (
          // ---------------- GROOVELAB SPECIFIC VIEW (APPLE-LIKE OVERHAUL) ----------------
          <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '40px', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Profile Card Header - Spacious & Clean iOS Widget Look */}
              {/* Üben Board */}
              <section>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1d1d1f', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.02em' }}>
                  <Clock size={16} style={{ color: '#007aff' }} /> Üben Board
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {practiceBoard.map((s: any) => (
                    <div key={s.id + s.level} style={{ 
                      background: '#ffffff', 
                      padding: '20px', 
                      borderRadius: '24px', 
                      border: '1px solid rgba(0, 0, 0, 0.04)',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.01)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{s.artist}</div>
                          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1d1d1f', marginTop: '2px' }}>{s.title}</div>
                        </div>
                        <div style={{ 
                          padding: '4px 10px', 
                          borderRadius: '99px', 
                          fontSize: '0.68rem', 
                          fontWeight: 700, 
                          background: s.level === 'starter' ? 'rgba(255, 149, 0, 0.08)' : 'rgba(0, 122, 255, 0.08)', 
                          color: s.level === 'starter' ? '#ff9500' : '#007aff' 
                        }}>
                          {s.level === 'starter' ? 'STARTER' : 'PRO'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexwrap: 'wrap', gap: '8px' }}>
            










































                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.01)'
                    }}>
                      <div style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{s.artist}</div>
                          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1d1d1f', marginTop: '2px' }}>{s.title}</div>
                        </div>
                        <div style={{ 
                          padding: '4px 10px', 
                          borderRadius: '99px', 
                          fontSize: '0.68rem', 
                          fontWeight: 700, 
                          background: 'rgba(52, 168, 83, 0.08)', 
                          color: '#34a853' 
                        }}>
                          {s.level === 'starter' ? 'STARTER' : 'PRO'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexwrap: 'wrap', gap: '8px' }}>
                        {s.instruments.filter((i: any) => i.is_stage_ready).map((inst: any, idx: number) => (
                          <div 
                            key={idx} 
                            title={`${inst.name}${inst.part_number > 1 || (s.instruments.filter((i:any) => i.name === inst.name).length > 1) ? ` ${inst.part_number}` : ''}`}
                            style={{ 
                              fontSize: '0.8rem', 
                              fontWeight: 600, 




                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <span>{renderInstrumentIcon(inst.name, undefined, 14)}</span>
                            <span>100% Meister</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {repertoire.length === 0 && !loading && (
                    <div style={{ fontSize: '0.85rem', color: '#86868b', background: '#ffffff', padding: '24px', borderRadius: '24px', border: '1px solid rgba(0, 0, 0, 0.04)', textAlign: 'center' }}>
                      Noch kein Repertoire.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <aside style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Module & Einstellungen - iOS Switched Settings Card (also displayed in GrooveLab view) */}
              <section style={{ 
                background: '#ffffff', 
                borderRadius: '24px', 
                padding: '24px', 
                border: '1px solid rgba(0, 0, 0, 0.04)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.01)

                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1d1d1f', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sliders size={16} style={{ color: '#86868b' }} /> Module & Einstellungen
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifycontent: 'space-between' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#1d1d1f' }}>Campus-Modul aktivieren</span>
                      <span style={{ fontSize: '0.72rem', color: '#86868b' }}>Stundenplan & meisterwerke</span>
                    </div>
                    <button 
                      onClick={() => handleToggleCampus(!isCampusActive)}
                      style={{
                        width: '46px',
                        height: '26px',
                        borderRadius: '99px',
                        background: isCampusActive ? '#34a853' : '#e5e5ea',
                        border: 'none',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'background 0.25s ease',
                        padding: 0
                      }}
                    >
                      <div style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        position: 'absolute',
                        top: '2px',
                        left: isCampusActive ? '22px' : '2px',
                        transition: 'left 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                    </button>
                  </div>

                  <div style={{ height: '0.5px', background: 'rgba(0, 0, 0, 0.06)' }} />

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#1d1d1f' }}>GrooveLab-Modul aktivieren</span>
                      <span style={{ fontSize: '0.72rem', color: '#86868b' }}>Songbooks, Bands & üben</span>
                    </div>
                    <button 
                      onClick={() => handleToggleGroovelab(!isGroovelabActive)}
                      style={{
                        width: '46px',
                        height: '26px',
                        borderRadius: '99px',
                        background: isGroovelabActive ? '#007aff' : '#e5e5ea',
                        border: 'none',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'background 0.25s ease',
                        padding: 0
                      }}
                    >
                      <div style={{
                            key={idx} 
                            title={`${inst.name}${inst.part_number > 1 || (s.instruments.filter((i:any) => i.name === inst.name).length > 1) ? ` ${inst.part_number}` : ''}`}
                            style={{ 
                              fontSize: '0.8rem', 
                              fontWeight: 600, 
                              padding: '6px 12px', 
                              borderRadius: '12px', 
                              background: 'rgba(52, 168, 83, 0.06)', 
                              color: '#34a853',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <span>{renderInstrumentIcon(inst.name, undefined, 14)}</span>
                            <span>100% Meister</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {repertoire.length === 0 && !loading && (
                    <div style={{ fontSize: '0.85rem', color: '#86868b', background: '#ffffff', padding: '24px', borderRadius: '24px', border: '1px solid rgba(0, 0, 0, 0.04)', textAlign: 'center' }}>
                      Noch kein Repertoire.
                    </d
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: 'zoom-out'
          }}
        >
          <img 
            src={student.photo_url || '/avatar_ghost.jpg'} 
            style={{ 
              maxWidth: '90%', 
              maxHeight: '90%', 
              borderRadius: '24px', 
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              border: '4px solid white'
            }} 
          />
        </div>
      )}
    </div>
  );
};






















































                        height: '22px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        position: 'absolute',
                        top: '2px',
                        left: isGroovelabActive ? '22px' : '2px',
                        transition: 'left 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                    </button>
                  </div>
                </div>
              </section>

              {/* Radar Chart */}
              <section>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1d1d1f', marginBottom: '16px', letterSpacing: '-0.02em' }}>
                  Fähigkeiten-Radar
                </h3>
                <div style={{ 
                  background: '#ffffff', 
                  borderRadius: '24px', 
                  border: '1px solid rgba(0, 0, 0, 0.04)', 
                  padding: '20px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" width={240} height={165} data={studentRadarData}>
                    <PolarGrid stroke="rgba(0,0,0,0.06)" />
                    <PolarAngleAxis dataKey="instrument" tick={({ x, y, payload }) => (
                      <text x={x} y={y} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 10, fontWeight: 700, fill: '#86868b' }}>
                        {payload.value}
                      </text>
                    )} />
                    <Radar name="XP" dataKey="xp" stroke="#007aff" fill="#007aff" fillOpacity={0.15} />
                  </RadarChart>
                </div>
              </section>

              {/* Meine Bands */}
              <section>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1d1d1f', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.02em' }}>
                  <Users size={16} style={{ color: '#ff2d55' }} /> Meine Bands
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {bands.map((b: any) => (
                    <div 
                      key={b.id} 
                      onClick={() => {
                        if (onOpenBandProfile) {
                          onOpenBandProfile(b);
                        }
                      }}
                      className={onOpenBandProfile ? "clickable-band-item" : ""}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '14px', 
                        padding: '14px 18px', 
                        background: '#ffffff', 
                        borderRadius: '20px', 
                        border: '1px solid rgba(0, 0, 0, 0.04)',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.01)',
                        cursor: onOpenBandProfile ? 'pointer' : 'default'
                      }}
                    >
    



























                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '0.5px solid rgba(0, 0, 0, 0.04)'
                    }}>
                      <span style={{ color: '#86868b' }}>{pres.dayStr}.</span>
                      <span>{pres.rangeStr}</span>
                    </div>
                  ))}
                  {weekSessions.length === 0 && (
                    <div style={{ fontSize: '0.85rem', color: '#86868b', background: '#ffffff', padding: '20px', textAlign: 'center' }}>
                      Keine reservierten Zeiten diese Woche.
                    </div>
                  )}
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
      {showFullPhoto && (
        <div 
          onClick={() => setShowFullPhoto(false)}
          style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 4000, 
            background: 'rgba(0,0,0,0.85)', 
            backdropFilter: 'blur(20px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: 'zoom-out'
          }}
        >
          <img 
            src={student.photo_url || '/avatar_ghost.jpg'} 
            style={{ 
              maxWidth: '90%', 
              maxHeight: '90%', 
              borderRadius: '24px', 
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              border: '4px solid white'
            }} 
          />
        </div>
      )}