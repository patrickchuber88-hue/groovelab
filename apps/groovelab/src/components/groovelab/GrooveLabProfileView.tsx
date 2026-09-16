import React, { lazy, Suspense, useMemo } from 'react';
import { useWindowSize } from 'react-use';
import { User, Star, QrCode, Users, Clock, Music, Calendar, Zap, Trash2 } from 'lucide-react';
import { StudioAvatar, renderBandAvatar } from '../StudioAvatar';
import { CampusGroovelabText } from '../CampusGroovelabBrand';
import { APP_INSTRUMENT_ICONS, APP_INSTRUMENT_COLORS } from '../../constants/instruments';
import { renderInstrumentIcon } from '../../utils/instruments';
import { formatTeacherFullName } from '../../utils/nameHelper';

const StudentRadarChart = lazy(() => import('../StudentRadarChart'));

export interface GrooveLabProfileViewProps {
  globalPlannedSlots?: any[];
  plannedSlots?: string[];
  toggleSlot?: (day: string, time: string) => Promise<void> | void;
  loggedInUserId?: string | null;

  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  teachers?: any[];
  userSongs?: any[];
  userBands?: any[];
  allBands?: any[];
  brandColor?: string;
  activePlatform?: string | null;
  supabase: any;
  fetchPlanningData?: (schoolId: string) => Promise<void> | void;
  onChangeAvatar: () => void;
  onShowQr: () => void;
  onOpenBandProfile: (band: any) => void;
  onOpenPrivacy: () => void;
  onOpenAgb: () => void;
  onOpenCancellation: () => void;
  onOpenImpressum: () => void;
  onOpenAccessibility: () => void;
}

export const GrooveLabProfileView: React.FC<GrooveLabProfileViewProps> = ({
  globalPlannedSlots = [],
  plannedSlots = [],
  toggleSlot,
  loggedInUserId,

  user,
  setUser,
  teachers = [],
  userSongs = [],
  userBands = [],
  allBands = [],
  brandColor = '#facc15',
  activePlatform = 'groovelab',
  supabase,
  fetchPlanningData,
  onChangeAvatar,
  onShowQr,
  onOpenBandProfile,
  onOpenPrivacy,
  onOpenAgb,
  onOpenCancellation,
  onOpenImpressum,
  onOpenAccessibility,
}) => {
  const { width = 1024 } = useWindowSize();
  const myBands = userBands || [];

  const calculateSkillXP = (skill: any) => {
    const prog = skill.progress || 0;
    if (skill.is_stage_ready || prog === 100) return 500;
    return prog * 2;
  };

  const studentRadarData = useMemo(() => {
    const radarBase: Record<string, number> = { Guitar: 0, Bass: 0, Drums: 0, Keys: 0, Vocals: 0 };
    (userSongs || []).forEach((s: any) => {
      const sInst = s.instrument?.toLowerCase();
      if (!sInst) return;
      let target: string | null = null;
      if (sInst === 'guitar' || sInst === 'e-gitarre') target = 'Guitar';
      else if (sInst === 'bass' || sInst === 'e-bass') target = 'Bass';
      else if (sInst === 'drums' || sInst === 'e-drums') target = 'Drums';
      else if (sInst === 'keys' || sInst === 'piano' || sInst === 'e-piano') target = 'Keys';
      else if (sInst === 'vocals' || sInst === 'gesang') target = 'Vocals';
      if (target && radarBase[target] !== undefined) {
        radarBase[target] += calculateSkillXP(s);
      }
    });
    return Object.entries(radarBase).map(([inst, xp]) => ({ instrument: inst, xp }));
  }, [userSongs]);

  const getTeacherTheme = (name: string, userId: string) => {
    const nameLower = (name || '').toLowerCase();
    if (nameLower.includes('patrick')) {
      return {
        solidBg: '#f59e0b', solidBorder: '#d97706',
        lightBg: 'rgba(245, 158, 11, 0.12)', lightBorder: 'rgba(245, 158, 11, 0.5)', lightText: '#d97706'
      };
    }
    if (nameLower.includes('manuel')) {
      return {
        solidBg: '#ea4335', solidBorder: '#c62828',
        lightBg: 'rgba(234, 67, 53, 0.12)', lightBorder: 'rgba(234, 67, 53, 0.5)', lightText: '#ea4335'
      };
    }
    if (nameLower.includes('boris')) {
      return {
        solidBg: '#34a853', solidBorder: '#34a853',
        lightBg: 'rgba(52, 168, 83, 0.12)', lightBorder: 'rgba(52, 168, 83, 0.5)', lightText: '#34a853'
      };
    }
    const palettes = [
      { solidBg: '#3b82f6', solidBorder: '#2563eb', lightBg: 'rgba(59, 130, 246, 0.12)', lightBorder: 'rgba(59, 130, 246, 0.5)', lightText: '#2563eb' },
      { solidBg: '#8b5cf6', solidBorder: '#7c3aed', lightBg: 'rgba(139, 92, 246, 0.12)', lightBorder: 'rgba(139, 92, 246, 0.5)', lightText: '#7c3aed' },
      { solidBg: '#ec4899', solidBorder: '#db2777', lightBg: 'rgba(236, 72, 153, 0.12)', lightBorder: 'rgba(236, 72, 153, 0.5)', lightText: '#db2777' },
      { solidBg: '#34a853', solidBorder: '#34a853', lightBg: 'rgba(52, 168, 83, 0.12)', lightBorder: 'rgba(52, 168, 83, 0.5)', lightText: '#34a853' },
      { solidBg: '#f43f5e', solidBorder: '#e11d48', lightBg: 'rgba(244, 63, 94, 0.12)', lightBorder: 'rgba(244, 63, 94, 0.5)', lightText: '#e11d48' },
    ];
    let hash = 0;
    for (let i = 0; i < nameLower.length; i++) {
      hash = nameLower.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % palettes.length;
    return palettes[index];
  };

  const getTeacherColorStyle = (teachersInSlot: any[], loggedInUserId: string | undefined) => {
    if (teachersInSlot.length > 1) {
      const containsMe = teachersInSlot.some(t => t.user_id === loggedInUserId);
      // Sort consistently by first_name to ensure same order of colors & initials (e.g. M+P)
      const sortedTeachers = [...teachersInSlot].sort((a, b) => {
        const nameA = a.profiles?.first_name || '';
        const nameB = b.profiles?.first_name || '';
        return nameA.localeCompare(nameB, 'de-DE');
      });
      const themes = sortedTeachers.map(t => {
        const name = (t.profiles?.first_name || '').toLowerCase();
        return getTeacherTheme(name, t.user_id || '');
      });
      const color1 = themes[0]?.solidBg || '#f59e0b';
      const color2 = themes[1]?.solidBg || '#34a853';
      const lightColor1 = themes[0]?.lightBg || 'rgba(245, 158, 11, 0.12)';
      const lightColor2 = themes[1]?.lightBg || 'rgba(52, 168, 83, 0.12)';

      if (containsMe) {
        return {
          bgColor: `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`,
          border: '1px solid #cbd5e1',
          textColor: 'white'
        };
      } else {
        return {
          bgColor: `linear-gradient(135deg, ${lightColor1} 0%, ${lightColor2} 100%)`,
          border: '1px dashed #cbd5e1',
          textColor: '#475569'
        };
      }
    }

    const primaryTeacher = teachersInSlot[0];
    const teacherName = (primaryTeacher?.profiles?.first_name || '').toLowerCase();
    const isMe = primaryTeacher?.user_id === loggedInUserId;
    
    const theme = getTeacherTheme(teacherName, primaryTeacher?.user_id || '');

    if (isMe) {
      return {
        bgColor: theme.solidBg,
        border: `1px solid ${theme.solidBorder}`,
        textColor: 'white'
      };
    } else {
      return {
        bgColor: theme.lightBg,
        border: `1px dashed ${theme.lightBorder}`,
        textColor: theme.lightText
      };
    }
  };

  const getTeacherPresenceList = () => {
    const schoolData = Array.isArray((user as any)?.schools) ? (user as any)?.schools[0] : (user as any)?.schools;
    const hours = schoolData?.opening_hours || {};

    const dayKeys: { [key: string]: string } = {
      'Mo': 'monday',
      'Di': 'tuesday',
      'Mi': 'wednesday',
      'Do': 'thursday',
      'Fr': 'friday',
      'Sa': 'saturday',
      'So': 'sunday'
    };

    const teacherSlots = globalPlannedSlots.filter((s: any) => {
      const isRoleMatch = s.profiles?.role?.toLowerCase() === 'teacher' || 
                          s.profiles?.role?.toLowerCase() === 'admin';
      if (!isRoleMatch) return false;

      const dayKey = dayKeys[s.day];
      if (!dayKey) return false;
      const dayHours = hours[dayKey];
      if (!dayHours || dayHours.active === false) return false;

      return s.time >= dayHours.start && s.time < dayHours.end;
    });
    
    if (teacherSlots.length === 0) return [];

    const teacherGroups: { [userId: string]: { name: string; slots: { day: string; time: string }[] } } = {};
    
    teacherSlots.forEach((slot: any) => {
      const userId = slot.user_id;
      const name = slot.profiles?.first_name || 'Lehrer';
      if (!teacherGroups[userId]) {
        teacherGroups[userId] = { name, slots: [] };
      }
      teacherGroups[userId].slots.push({ day: slot.day, time: slot.time });
    });

    const presenceList: { teacherName: string; day: string; rangeStr: string; sortKey: number }[] = [];
    const dayOrder: { [day: string]: number } = { 'Mo': 1, 'Di': 2, 'Mi': 3, 'Do': 4, 'Fr': 5, 'Sa': 6, 'So': 7 };

    Object.values(teacherGroups).forEach(group => {
      const slotsByDay: { [day: string]: string[] } = {};
      group.slots.forEach(s => {
        if (!slotsByDay[s.day]) slotsByDay[s.day] = [];
        slotsByDay[s.day].push(s.time);
      });

      Object.entries(slotsByDay).forEach(([day, times]) => {
        times.sort();

        const add15 = (t: string) => {
          let [h, m] = t.split(':').map(Number);
          m += 15;
          if (m >= 60) { h += 1; m = 0; }
          return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        };

        const toMin = (t: string) => {
          const [h, m] = t.split(':').map(Number);
          return h * 60 + m;
        };

        const ranges: { start: string; end: string }[] = [];
        let currentRange: { start: string; end: string } | null = null;

        times.forEach(t => {
          if (!currentRange) {
            currentRange = { start: t, end: add15(t) };
          } else {
            if (toMin(t) === toMin(currentRange.end)) {
              currentRange.end = add15(t);
            } else {
              ranges.push(currentRange);
              currentRange = { start: t, end: add15(t) };
            }
          }
        });
        if (currentRange) ranges.push(currentRange);

        ranges.forEach(r => {
          presenceList.push({
            teacherName: group.name,
            day,
            rangeStr: `${r.start} Uhr - ${r.end} Uhr`,
            sortKey: (dayOrder[day] || 99) * 10000 + toMin(r.start)
          });
        });
      });
    });

    presenceList.sort((a, b) => a.sortKey - b.sortKey);
    return presenceList;
  };

  return (
                <div className="animation-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '100%', margin: '0 auto', width: '100%', marginTop: '14px' }}>
              {/* Top: Massive Hero Card */}
              <div className="glass-panel" style={{ background: 'white', borderRadius: '32px', display: 'flex', overflow: 'hidden', minHeight: '440px' }}>
                <div style={{ flex: '0 0 40%', background: '#f8fafc', position: 'relative', overflow: 'hidden' }}>
                  <StudioAvatar src={user.photo_url || '/avatar_ghost.jpg'} user={user} style={{ position: 'absolute', inset: 0 }} />
                  {/* Edit Button Overlay */}
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'all 0.3s' }} className="photo-overlay">
                    <button 
                      onClick={() => {
                        onChangeAvatar();
                      }}
                      style={{ 
                        position: 'absolute', bottom: '24px', right: '24px',
                        background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.2)', 
                        color: 'white', padding: '12px 20px', borderRadius: '16px', fontWeight: 900, cursor: 'pointer', 
                        display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' 
                      }}
                    >
                      <User size={16} /> PROFILBILD ÄNDERN
                    </button>
                  </div>
                </div>
                
                <div style={{ flex: '1', padding: '48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  {/* Badge row */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{
                      background: (user.role === 'teacher' || user.role === 'admin' || user.role === 'secretary') ? 'linear-gradient(135deg, #eab308, #ca8a04)' : '#f59e0b',
                      color: 'white', padding: '4px 12px', borderRadius: '8px',
                      fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em',
                      boxShadow: '0 4px 10px rgba(234, 179, 8, 0.25)'
                    }}>
                      {(user.role === 'teacher' || user.role === 'admin' || user.role === 'secretary') ? 'GrooveLab Coach' : 'Pro Artist'}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 700 }}>{user.schools?.name || 'Campus-Groovelab'}</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 500 }}>• Mitglied seit {user.created_at && !isNaN(new Date(user.created_at).getTime()) ? new Date(user.created_at).toLocaleDateString() : 'unbekannt'}</span>

                    {/* XP only for students */}
                    {user.role === 'student' && (
                      <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', padding: '4px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 950, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)' }}>
                        <Star size={12} fill="white" /> {userSongs.filter(s => s.progress === 100).length * 100} XP
                      </div>
                    )}

                    {/* Campus-Ausweis Button */}
                    {(user?.qr_token || user?.teacher_qr_token) && (
                      <button 
                        onClick={onShowQr}
                        style={{
                          background: 'linear-gradient(135deg, #eab308, #ca8a04)',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 950,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(234, 179, 8, 0.3)'
                        }}
                      >
                        <QrCode size={12} />
                        <span>CAMPUS-GROOVELAB AUSWEIS</span>
                      </button>
                    )}
                  </div>

                  <h1 style={{ fontSize: '3.5rem', fontWeight: 900, color: '#1e293b', margin: '0 0 16px 0', letterSpacing: '-0.03em' }}>
                    {user.role === 'student' ? (activePlatform === 'groovelab' ? user.first_name : 'Hausaufgabenheft') : formatTeacherFullName(user.first_name, user.last_name)}
                  </h1>

                  {/* GrooveLab Instrument Selection Buttons for Coach */}
                  {(user.role === 'teacher' || user.role === 'admin' || user.role === 'secretary') ? (
                    (() => {
                      const groovelabInstDefs = [
                        { key: 'Gitarre', altKey: 'E-Gitarre', label: 'E-Gitarre', instName: 'E-Gitarre' },
                        { key: 'Piano / Keys', altKey: 'E-Piano', label: 'E-Piano', instName: 'E-Piano' },
                        { key: 'Drums', altKey: 'E-Drum', label: 'E-Drum', instName: 'Drums' },
                        { key: 'Bass', altKey: 'E-Bass', label: 'E-Bass', instName: 'E-Bass' },
                        { key: 'Vocals', altKey: 'Gesang', label: 'Gesang', instName: 'Vocals' }
                      ];

                      const currentRaw = (user.groovelab_instrument || '');
                      const currentInstList = currentRaw.split(',').map((s: string) => s.trim()).filter(Boolean);

                      const toggleGrooveLabInstrument = async (instDef: typeof groovelabInstDefs[0]) => {
                        const isCurrentlySelected = currentInstList.some((s: string) => 
                          s === instDef.key || s === instDef.altKey || s === instDef.label
                        );

                        let nextList: string[];
                        if (isCurrentlySelected) {
                          nextList = currentInstList.filter((s: string) => 
                            s !== instDef.key && s !== instDef.altKey && s !== instDef.label
                          );
                        } else {
                          nextList = [...currentInstList, instDef.key];
                        }

                        const newStr = nextList.join(', ');

                        // Instant local state update
                        setUser((prev: any) => prev ? { ...prev, groovelab_instrument: newStr } : prev);

                        // Persist to Supabase
                        try {
                          await supabase.from('users').update({ groovelab_instrument: newStr }).eq('id', user.id);
                        } catch (err) {
                          console.error('[GrooveLab] Error saving groovelab_instrument:', err);
                        }
                      };

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            GrooveLab-Instrumente (Klicke zum Aktivieren):
                          </div>
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {groovelabInstDefs.map((instDef) => {
                              const isActive = currentInstList.some((s: string) => 
                                s === instDef.key || s === instDef.altKey || s === instDef.label
                              );

                              return (
                                <button
                                  key={instDef.label}
                                  type="button"
                                  onClick={() => toggleGrooveLabInstrument(instDef)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 16px',
                                    borderRadius: '14px',
                                    fontSize: '0.82rem',
                                    fontWeight: isActive ? 900 : 700,
                                    border: isActive ? 'none' : '1.5px dashed #cbd5e1',
                                    background: isActive ? 'linear-gradient(135deg, #eab308, #ca8a04)' : '#f8fafc',
                                    color: isActive ? 'white' : '#64748b',
                                    cursor: 'pointer',
                                    boxShadow: isActive ? '0 4px 14px rgba(234, 179, 8, 0.35)' : 'none',
                                    transition: 'all 0.2s ease',
                                  }}
                                  onMouseOver={(e) => {
                                    if (!isActive) {
                                      e.currentTarget.style.borderColor = '#eab308';
                                      e.currentTarget.style.color = '#ca8a04';
                                    }
                                  }}
                                  onMouseOut={(e) => {
                                    if (!isActive) {
                                      e.currentTarget.style.borderColor = '#cbd5e1';
                                      e.currentTarget.style.color = '#64748b';
                                    }
                                  }}
                                >
                                  {renderInstrumentIcon(instDef.instName, isActive ? '#ffffff' : undefined, 18)}
                                  <span>{instDef.label}</span>
                                  {isActive && <span style={{ fontSize: '0.75rem', marginLeft: '2px' }}>✓</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    // STUDENT: show instrument challenge counters
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                      {['Guitar', 'Drums', 'Keys', 'Bass', 'Vocals'].map(inst => {
                        const count = userSongs.filter(s => {
                          const sInst = s.instrument?.toLowerCase();
                          const target = inst.toLowerCase();
                          let match = false;
                          if (target === 'guitar') match = sInst === 'guitar' || sInst === 'e-gitarre';
                          else if (target === 'bass') match = sInst === 'bass' || sInst === 'e-bass';
                          else if (target === 'drums') match = sInst === 'drums' || sInst === 'e-drums';
                          else if (target === 'keys') match = sInst === 'keys' || sInst === 'piano' || sInst === 'e-piano';
                          else if (target === 'vocals') match = sInst === 'vocals' || sInst === 'gesang';
                          else match = sInst === target;
                          return match && s.progress === 100;
                        }).length;
                        return (
                          <div key={inst} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '8px 14px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                            <span style={{ fontSize: '1.25rem' }}>{APP_INSTRUMENT_ICONS[inst as keyof typeof APP_INSTRUMENT_ICONS] || (inst === 'Vocals' ? '🎤' : '🎵')}</span>
                            <span style={{ fontSize: '1rem', fontWeight: 900, color: count > 0 ? brandColor : '#94a3b8' }}>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* COACH: Profile info cards */}
                  {(user.role === 'teacher' || user.role === 'admin') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                      {user.bio && (
                        <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '12px 16px', border: '1px solid #f1f5f9' }}>
                          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Werdegang</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569', lineHeight: 1.5 }}>{user.bio}</div>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {user.expertise && (
                          <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '10px 14px', border: '1px solid #f1f5f9', flex: 1, minWidth: '140px' }}>
                            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Expertise & Stile</div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>{user.expertise}</div>
                          </div>
                        )}
                        {user.bands && activePlatform === 'campus' && (
                          <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '10px 14px', border: '1px solid #f1f5f9', flex: 1, minWidth: '140px' }}>
                            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Bands & Projekte</div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>{user.bands}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}


                </div>
              </div>
              {user.role === 'student' && (
                <>
                  {/* Bottom: Radar & Planner */}
                  <div style={{ display: 'grid', gridTemplateColumns: width < 800 ? '1fr' : '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                    {/* Skill Radar */}
                    <div className="glass-panel" style={{ background: 'white', borderRadius: '32px', padding: '32px' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ color: '#f59e0b' }}><Music size={24} /></div>
                        Skill Radar
                      </h3>
                      <Suspense fallback={<div style={{ height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Lade Radar...</div>}>
                        <StudentRadarChart studentRadarData={studentRadarData} />
                      </Suspense>
                    </div>

                    {/* Wochen-Planner */}
                    <div className="glass-panel" style={{ background: 'white', borderRadius: '32px', padding: '32px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                        <div>
                          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ color: '#f59e0b' }}><Clock size={24} /></div>
                            Wochen-Planner
                            {((user as any)?.role?.toLowerCase() === 'admin' || (user as any)?.role?.toLowerCase() === 'teacher') && (
                              <button 
                                onClick={async () => {
                                  if (window.confirm('VORSICHT: Möchtest du wirklich ALLE Wochenplan-Einträge für diese Schule löschen?')) {
                                    const schoolData = Array.isArray((user as any)?.schools) ? (user as any)?.schools[0] : (user as any)?.schools;
                                    if (!schoolData?.id) return;
                                    const { error } = await supabase.from('lab_planning').delete().eq('school_id', schoolData.id);
                                    if (error) alert('Fehler: ' + error.message);
                                    else {
                                      alert('Wochenplan wurde auf 0 zurückgesetzt! ✅');
                                      if (fetchPlanningData) fetchPlanningData(schoolData.id);
                                    }
                                  }
                                }}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', opacity: 0.6 }}
                                title="Wochenplan komplett leeren (Admin)"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </h3>
                          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Plane deine Sessions & vermeide Stoßzeiten.</p>
                        </div>
                        {/* Legend */}
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', background: '#f8fafc', padding: '10px 16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>
                            <div style={{ 
                              width: '10px', 
                              height: '10px', 
                              borderRadius: '3px', 
                              border: '1px solid #cbd5e1', 
                              background: '#f8fafc', 
                              position: 'relative', 
                              overflow: 'hidden' 
                            }}>
                              <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '3px', background: '#f59e0b' }}></div>
                            </div> Deine Zeit
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(79, 70, 229, 0.4)' }}></div> Lab voll
                          </div>
                          
                        </div>
                      </div>

                       {(() => {
                          const schoolData = Array.isArray((user as any)?.schools) ? (user as any)?.schools[0] : (user as any)?.schools;
                          const hours = schoolData?.opening_hours || {};
                          
                          const dayConfigs = [
                            { id: 'Mo', key: 'monday' },
                            { id: 'Di', key: 'tuesday' },
                            { id: 'Mi', key: 'wednesday' },
                            { id: 'Do', key: 'thursday' },
                            { id: 'Fr', key: 'friday' },
                            { id: 'Sa', key: 'saturday' },
                            { id: 'So', key: 'sunday' }
                          ];

                          const activeDays = dayConfigs.filter(d => hours[d.key]?.active !== false);
                          
                          if (activeDays.length === 0) {
                            return <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '0.8rem' }}>Keine Öffnungszeiten im Setup hinterlegt.</div>;
                          }

                          let minH = 22;
                          let maxH = 0;
                          activeDays.forEach(d => {
                            const h = hours[d.key];
                            if (h?.start) minH = Math.min(minH, parseInt(h.start.split(':')[0]));
                            if (h?.end) maxH = Math.max(maxH, parseInt(h.end.split(':')[0]));
                          });

                          if (minH > 21) minH = 8;
                          if (maxH < 1) maxH = 20;

                          return (
                            <>
                              <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(${activeDays.length}, 1fr)`, gap: '6px', border: '1px solid #f1f5f9', background: '#f8fafc', padding: '12px', borderRadius: '24px' }}>
                                <div style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: 800, color: '#cbd5e1' }}></div>
                                {activeDays.map(d => (
                                  <div key={d.id} style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: 800, color: '#64748b' }}>{d.id}</div>
                                ))}

                                {(() => {
                                  let minTime = "23:59";
                                  let maxTime = "00:00";
                                  activeDays.forEach(d => {
                                    const h = hours[d.key];
                                    if (h?.active !== false && h?.start && h.start < minTime) minTime = h.start;
                                    if (h?.active !== false && h?.end && h.end > maxTime) maxTime = h.end;
                                  });

                                  if (minTime === "23:59") minTime = "16:00";
                                  if (maxTime === "00:00") maxTime = "20:00";

                                  const timeRows = [];
                                  let current = minTime;

                                  // Helper to add 15 minutes to HH:mm string
                                  const add15 = (t: string) => {
                                    let [h, m] = t.split(':').map(Number);
                                    m += 15;
                                    if (m >= 60) { h += 1; m = 0; }
                                    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                                  };

                                  while (current < maxTime) {
                                    const time = current;
                                    timeRows.push(
                                      <React.Fragment key={time}>
                                        <div style={{ fontSize: '0.6rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', fontWeight: 600 }}>{time}</div>
                                        {activeDays.map(day => {
                                          const key = `${day.id}-${time}`;
                                          const isPlanned = plannedSlots.includes(key);
                                          
                                          // Exclude teachers from student count
                                          const totalCount = globalPlannedSlots.filter(s => 
                                            s.day === day.id && 
                                            s.time === time && 
                                            s.profiles?.role?.toLowerCase() !== 'teacher' && 
                                            s.profiles?.role?.toLowerCase() !== 'admin'
                                          ).length;

                                          const teachersInSlot = globalPlannedSlots.filter(s => 
                                            s.day === day.id && 
                                            s.time === time && 
                                            (s.profiles?.role?.toLowerCase() === 'teacher' || s.profiles?.role?.toLowerCase() === 'admin')
                                          );
                                          const hasTeacher = teachersInSlot.length > 0;

                                          const dayHours = hours[day.key];
                                          const isOpen = (dayHours?.active !== false) && time >= (dayHours?.start || '08:00') && time < (dayHours?.end || '20:00');

                                          let bgColor = 'white';
                                          let textColor = '#64748b';
                                          let border = '1px solid #f1f5f9';
                                          let cursor = 'pointer';
                                          let content: any = '';

                                          if (!isOpen) {
                                            bgColor = '#f1f5f9';
                                            textColor = '#cbd5e1';
                                            cursor = 'not-allowed';
                                            content = <span style={{ opacity: 0.3, fontSize: '0.6rem' }}>✕</span>;
                                          } else {
                                            // 1. Determine Background, Border, and Text Color based strictly on heatmap density and coach presence
                                            if (isPlanned) {
                                              // Solid brand gold-amber für eigene geplante Zeiten — durchgehend kräftig, leuchtend und einheitlich!
                                              bgColor = '#f59e0b';
                                              textColor = 'white';
                                              border = '1px solid #d97706';
                                            } else {
                                              // Soft transparent purple/blue heatmap for other slots — linear progressive up to 8 stations!
                                              if (totalCount > 0) {
                                                const maxCapacity = 8;
                                                const minOpacity = 0.08;
                                                const maxOpacity = 0.68;
                                                const count = Math.min(totalCount, maxCapacity);
                                                const opacity = count <= 1 ? minOpacity : minOpacity + (count - 1) * ((maxOpacity - minOpacity) / (maxCapacity - 1));
                                                bgColor = `rgba(79, 70, 229, ${opacity})`;
                                                textColor = opacity >= 0.35 ? 'white' : '#4f46e5';
                                                border = `1px solid rgba(79, 70, 229, ${opacity + 0.1})`;
                                              }
                                              
                                              // Teacher slots are not highlighted in student planner as requested
                                            }
                                            
                                            

                                            // 2. Determine Inner Content (Student Count + Coach Badge)
                                            

                                            if (totalCount > 0) {
                                              content = (
                                                <span style={{ fontSize: '0.75rem', fontWeight: 900 }}>
                                                  {totalCount}
                                                </span>
                                              );
                                            }
                                          }

                                          return (
                                            <button 
                                              key={`${day.id}-${time}`}
                                              onClick={() => {
                                                if (isOpen && toggleSlot) toggleSlot(day.id, time);
                                              }}
                                              style={{ 
                                                cursor: cursor, 
                                                height: '24px', 
                                                background: bgColor,
                                                borderRadius: '5px', 
                                                border: border,
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center', 
                                                color: textColor,
                                                fontSize: '0.65rem', 
                                                fontWeight: 900, 
                                                transition: 'all 0.1s',
                                                boxShadow: isPlanned ? `0 2px 8px ${bgColor}50` : 'none',
                                                opacity: isOpen ? 1 : 0.6,
                                                padding: 0,
                                                width: '100%',
                                                position: 'relative',
                                                zIndex: 10,
                                                pointerEvents: 'auto'
                                              }}>
                                              {content}
                                            </button>
                                          );
                                        })}
                                      </React.Fragment>
                                    );
                                    current = add15(current);
                                  }
                                  return timeRows;
                                })()}
                              </div>

                              {/* Teachers presence list under the grid */}
                              {(() => {
                                const teacherPresences = getTeacherPresenceList();
                                if (teacherPresences.length === 0) return null;
                                
                                const groupedPresences: { [teacherName: string]: typeof teacherPresences } = {};
                                teacherPresences.forEach(pres => {
                                  if (!groupedPresences[pres.teacherName]) {
                                    groupedPresences[pres.teacherName] = [];
                                  }
                                  groupedPresences[pres.teacherName].push(pres);
                                });

                                return (
                                  <div style={{ marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontSize: '1.1rem' }}>👨‍🏫</span>
                                      Anwesende Coaches diese Woche:
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                      {Object.entries(groupedPresences).map(([teacherName, presList]) => {
                                        const theme = getTeacherTheme(teacherName, '');
                                        const dotColor = theme.solidBg;
                                        return (
                                          <div key={teacherName} style={{ 
                                            display: 'flex', 
                                            alignItems: 'center',
                                            flexWrap: 'wrap',
                                            gap: '6px',
                                            background: '#f8fafc', 
                                            border: '1px solid #f1f5f9', 
                                            padding: '7px 12px', 
                                            borderRadius: '12px' 
                                          }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                                              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: dotColor }}></div>
                                              <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#1e293b' }}>{teacherName}</span>
                                            </div>
                                            <span style={{ color: '#cbd5e1', fontSize: '0.7rem' }}>·</span>
                                            {(presList as any[]).map((pres: any, idx: number) => (
                                              <span key={idx} style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                                                {idx > 0 && <span style={{ color: '#cbd5e1', marginRight: '4px' }}>·</span>}
                                                <span style={{ fontWeight: 800, color: '#1e293b' }}>{pres.day}.</span> {pres.rangeStr}
                                              </span>
                                            ))}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}
                            </>
                          );
                        })()}
                    </div>
                  </div>

                  {/* Third Row: Repertoire & Bands */}
                  <div style={{ display: 'grid', gridTemplateColumns: width < 800 ? '1fr' : '1fr 1fr', gap: '24px', paddingBottom: '32px' }}>
                    {/* Übesongs */}
                    <div className="glass-panel" style={{ background: 'white', borderRadius: '32px', padding: '32px' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ color: brandColor }}><Music size={24} /></div>
                        Aktuelle Songs
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {(() => {
                          const grouped = userSongs.reduce((acc: any, skill: any) => {
                            const level = skill.difficulty_level || 'original';
                            const key = `${skill.song_id}_${level}`;
                            if (!acc[key]) {
                              acc[key] = {
                                song_id: skill.song_id,
                                title: skill.title,
                                artist: skill.artist,
                                level: level,
                                media_link: skill.media_link,
                                tomplay_url: skill.tomplay_url,
                                instrumentation: skill.instrumentation,
                                skills: []
                              };
                            }
                            acc[key].skills.push(skill);
                            return acc;
                          }, {});

                          const activeGroups = Object.values(grouped).filter((group: any) => 
                            group.skills.some((s: any) => s.progress > 0)
                          );

                          if (activeGroups.length === 0) {
                            return <div style={{ textAlign: 'center', padding: '40px 0', color: '#cbd5e1', fontSize: '0.9rem' }}>Noch keine aktiven Songs im Repertoire (&gt;0%).</div>;
                          }

                          return activeGroups.map((group: any) => (
                            <div key={`${group.song_id}_${group.level}`} style={{ background: '#f8fafc', padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9', position: 'relative' }}>
                              <div style={{ 
                                position: 'absolute', 
                                top: '24px', 
                                right: '24px', 
                                background: group.level === 'original' ? '#eff6ff' : '#fff7ed', 
                                color: group.level === 'original' ? '#3b82f6' : '#f59e0b',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontSize: '0.65rem',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <Zap size={10} fill="currentColor" /> {group.level === 'original' ? 'PRO' : 'STARTER'}
                              </div>

                              <div style={{ marginBottom: '20px' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{group.artist}</div>
                                <div style={{ fontWeight: 900, fontSize: '1.25rem', color: '#1e293b', marginTop: '2px' }}>{group.title}</div>
                              </div>
                              
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                {group.skills
                                  .filter((s: any) => s.instrument !== 'Vocals')
                                  .map((s: any) => (
                                    <div 
                                      key={s.id} 
                                      style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '6px', 
                                        padding: '6px 12px', 
                                        background: s.progress > 0 ? `${APP_INSTRUMENT_COLORS[s.instrument]}15` : '#f8fafc',
                                        borderRadius: '12px',
                                        border: `1px solid ${s.progress > 0 ? `${APP_INSTRUMENT_COLORS[s.instrument]}20` : '#f1f5f9'}`,
                                        opacity: s.progress > 0 ? 1 : 0.3,
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                      }}
                                    >
                                      <span style={{ fontSize: '1.1rem' }}>{APP_INSTRUMENT_ICONS[s.instrument] || '🎸'}</span>
                                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: s.progress > 0 ? APP_INSTRUMENT_COLORS[s.instrument] : '#94a3b8' }}>
                                        {s.progress}%
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* Bands */}
                    <div className="glass-panel" style={{ background: 'white', borderRadius: '32px', padding: '32px' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ color: '#ec4899' }}><Users size={24} /></div>
                        Meine Bands
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {myBands.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '40px 0', color: '#cbd5e1' }}>Du bist noch in keiner Band. Übe fleißig für dein erstes Stage Ready!</div>
                        ) : (
                          myBands.map((b: any) => (
                            <button 
                              key={b.id} 
                              className="hover-card" 
                              onClick={() => {
                                onOpenBandProfile(b);
                              }}
                              style={{ width: '100%', textAlign: 'left', cursor: 'pointer', padding: '24px', background: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9', display: 'flex', gap: '20px', alignItems: 'center', transition: 'all 0.2s' }}>
                              {renderBandAvatar(b.name, b.photo_url, '64px', '18px')}
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>{b.name}</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>
                                  {b.songs?.title || b.band_songs?.[0]?.songs?.title || b.genre || 'Jam Session'}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                  <div style={{ display: 'flex', gap: '0' }}>
                                    {b.band_members?.slice(0, 5).map((m: any, idx: number) => {
                                      const u = Array.isArray(m.users) ? m.users[0] : m.users;
                                      return (
                                        <div key={idx} style={{ 
                                          width: '28px', 
                                          height: '28px', 
                                          borderRadius: '50%', 
                                          border: '2px solid white', 
                                          marginLeft: idx === 0 ? 0 : '-10px', 
                                          overflow: 'hidden', 
                                          background: m.user_id ? '#f1f5f9' : '#000000',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          zIndex: 5 - idx
                                        }}>
                                          {m.user_id ? (
                                            <StudioAvatar src={u?.photo_url} user={u} />
                                          ) : (
                                            <span style={{ color: 'white', fontSize: '0.6rem', fontWeight: 900 }}>{m.external_name?.[0] || 'E'}</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
              {user.role !== 'student' && (
                <>
                  {/* Professional GrooveLab Coach Metrics Grid (3 columns) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                    {/* Metric 1: Betreute Bands */}
                    <div style={{ background: 'white', border: '1px solid rgba(234, 179, 8, 0.15)', borderRadius: '24px', padding: '24px', display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 4px 16px rgba(234, 179, 8, 0.04)' }}>
                      <div style={{ height: '48px', width: '48px', borderRadius: '14px', background: 'rgba(234, 179, 8, 0.12)', color: '#ca8a04', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Users size={22} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Betreute Bands</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Urbanist', sans-serif" }}>
                          {(() => {
                            const coached = (allBands || []).filter((b: any) => {
                              const isReal = b.name && b.name !== '__SYSTEM_ANNOUNCEMENTS__' && !b.name.startsWith('__SYSTEM_');
                              if (!isReal) return false;
                              const isCoach = b.coach_id === user.id || (b.coach && b.coach.id === user.id);
                              const isMember = (b.band_members || []).some((m: any) => m.user_id === user.id);
                              const hasMyStudent = (b.band_members || []).some((m: any) => {
                                const u = m.users ? (Array.isArray(m.users) ? m.users[0] : m.users) : null;
                                return u && u.teacher_id === user.id;
                              });
                              return isCoach || isMember || hasMyStudent;
                            });
                            const map = new Map();
                            coached.forEach((b: any) => map.set(b.id, b));
                            (userBands || []).filter((b: any) => b.name && b.name !== '__SYSTEM_ANNOUNCEMENTS__' && !b.name.startsWith('__SYSTEM_')).forEach((b: any) => map.set(b.id, b));
                            const count = map.size;
                            return `${count} ${count === 1 ? 'Band' : 'Bands'}`;
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Metric 2: Präsenztage */}
                    <div style={{ background: 'white', border: '1px solid rgba(234, 179, 8, 0.15)', borderRadius: '24px', padding: '24px', display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 4px 16px rgba(234, 179, 8, 0.04)' }}>
                      <div style={{ height: '48px', width: '48px', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Calendar size={22} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Präsenztage</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Urbanist', sans-serif" }}>
                          {(() => {
                            const mySlots = (globalPlannedSlots || []).filter((s: any) => s.user_id === user.id);
                            const uniqueDays = new Set(mySlots.map((s: any) => s.day)).size;
                            return `${uniqueDays} ${uniqueDays === 1 ? 'Tag' : 'Tage'}`;
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Metric 3: GrooveLab-Instrumente */}
                    <div style={{ background: 'white', border: '1px solid rgba(234, 179, 8, 0.15)', borderRadius: '24px', padding: '24px', display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 4px 16px rgba(234, 179, 8, 0.04)' }}>
                      <div style={{ height: '48px', width: '48px', borderRadius: '14px', background: 'rgba(202, 138, 4, 0.12)', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Music size={22} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>GrooveLab-Instrumente</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Urbanist', sans-serif" }}>
                          {(user.groovelab_instrument || user.instrument || '').split(',').map((s: string) => s.trim()).filter(Boolean).length} Instrumente
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Teaching Days & Coached Bands Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: width < 800 ? '1fr' : '1fr 1fr', gap: '24px' }}>
                    {/* Day Availability Calendar Planner */}
                    <div style={{ background: 'white', border: '1px solid rgba(234, 179, 8, 0.15)', borderRadius: '32px', padding: '32px', boxShadow: '0 8px 30px rgba(234, 179, 8, 0.03)' }}>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 20px 0', fontFamily: "'Urbanist', sans-serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={20} style={{ color: '#eab308' }} />
                        Anwesenheitszeiten & Startzeiten
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {(() => {
                          const dayNames: { [key: string]: string } = {
                            'Mo': 'Montag',
                            'Di': 'Dienstag',
                            'Mi': 'Mittwoch',
                            'Do': 'Donnerstag',
                            'Fr': 'Freitag',
                            'Sa': 'Samstag',
                            'So': 'Sonntag'
                          };

                          const mySlots = (globalPlannedSlots || []).filter((s: any) => s.user_id === user.id);
                          
                          const slotsByDay: { [day: string]: string[] } = {};
                          mySlots.forEach((s: any) => {
                            if (!slotsByDay[s.day]) slotsByDay[s.day] = [];
                            slotsByDay[s.day].push(s.time);
                          });

                          const dayOrder: { [day: string]: number } = { 'Mo': 1, 'Di': 2, 'Mi': 3, 'Do': 4, 'Fr': 5, 'Sa': 6, 'So': 7 };
                          
                          const add15 = (t: string) => {
                            let [h, m] = t.split(':').map(Number);
                            m += 15;
                            if (m >= 60) { h += 1; m = 0; }
                            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                          };

                          const toMin = (t: string) => {
                            const [h, m] = t.split(':').map(Number);
                            return h * 60 + m;
                          };

                          const presences: { dayCode: string; dayName: string; rangeStr: string }[] = [];

                          Object.entries(slotsByDay)
                            .sort(([a], [b]) => (dayOrder[a] || 99) - (dayOrder[b] || 99))
                            .forEach(([day, times]) => {
                              times.sort();
                              const ranges: { start: string; end: string }[] = [];
                              let currentRange: { start: string; end: string } | null = null;

                              times.forEach(t => {
                                if (!currentRange) {
                                  currentRange = { start: t, end: add15(t) };
                                } else {
                                  if (toMin(t) === toMin(currentRange.end)) {
                                    currentRange.end = add15(t);
                                  } else {
                                    ranges.push(currentRange);
                                    currentRange = { start: t, end: add15(t) };
                                  }
                                }
                              });
                              if (currentRange) ranges.push(currentRange);

                              const rangeStr = ranges.map(r => `${r.start} bis ${r.end} Uhr`).join(', ');
                              presences.push({
                                dayCode: day,
                                dayName: dayNames[day] || day,
                                rangeStr
                              });
                            });

                          return presences.length > 0 ? (
                            presences.map((p) => (
                              <div key={p.dayCode} style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                padding: '14px 18px', 
                                background: '#f8fafc', 
                                borderRadius: '16px', 
                                border: '1px solid #f1f5f9' 
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{ height: '36px', width: '36px', borderRadius: '10px', background: '#ffffff', border: '1px solid rgba(234, 179, 8, 0.15)', color: '#ca8a04', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Calendar size={18} />
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>
                                      {p.dayName}s
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                                      Präsenzzeit: {p.rangeStr}
                                    </div>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ background: 'rgba(234, 179, 8, 0.12)', color: '#ca8a04', padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800 }}>
                                    Aktiv
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', border: '2.5px dashed #cbd5e1', borderRadius: '20px' }}>
                              Bisher keine Präsenzzeiten im Wochen-Planner eingetragen.
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Coached Bands Overview */}
                    {(() => {
                      const coached = (allBands || []).filter((b: any) => {
                        const isReal = b.name && b.name !== '__SYSTEM_ANNOUNCEMENTS__' && !b.name.startsWith('__SYSTEM_');
                        if (!isReal) return false;
                        const isCoach = b.coach_id === user.id || (b.coach && b.coach.id === user.id);
                        const isMember = (b.band_members || []).some((m: any) => m.user_id === user.id);
                        const hasMyStudent = (b.band_members || []).some((m: any) => {
                          const u = m.users ? (Array.isArray(m.users) ? m.users[0] : m.users) : null;
                          return u && u.teacher_id === user.id;
                        });
                        return isCoach || isMember || hasMyStudent;
                      });
                      const map = new Map();
                      coached.forEach((b: any) => map.set(b.id, b));
                      (userBands || []).filter((b: any) => b.name && b.name !== '__SYSTEM_ANNOUNCEMENTS__' && !b.name.startsWith('__SYSTEM_')).forEach((b: any) => map.set(b.id, b));
                      const teacherBandsList = Array.from(map.values());

                      return (
                        <div style={{ background: 'white', border: '1px solid rgba(234, 179, 8, 0.15)', borderRadius: '32px', padding: '32px', boxShadow: '0 8px 30px rgba(234, 179, 8, 0.03)' }}>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 20px 0', fontFamily: "'Urbanist', sans-serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Users size={20} style={{ color: '#eab308' }} />
                            Betreute Band-Projekte ({teacherBandsList.length})
                          </h3>
                          {teacherBandsList.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {teacherBandsList.map((band: any) => {
                                const songTitle = band.song?.title || (band.songs ? (Array.isArray(band.songs) ? band.songs[0]?.title : band.songs.title) : null) || 'Noch kein Song zugewiesen';
                                const memberCount = Array.isArray(band.band_members) ? band.band_members.length : (Array.isArray(band.members) ? band.members.length : 0);
                                return (
                                  <div key={band.id || band.name} style={{
                                    background: '#f8fafc',
                                    border: '1px solid #f1f5f9',
                                    borderRadius: '18px',
                                    padding: '16px 20px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}>
                                    <div>
                                      <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.98rem', fontFamily: "'Urbanist', sans-serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Users size={16} style={{ color: '#ca8a04' }} />
                                        <span>{band.name || band.band_name || 'Unbenannte Band'}</span>
                                      </div>
                                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Music size={12} style={{ color: '#eab308' }} /> {songTitle}
                                      </div>
                                    </div>
                                    <span style={{ background: 'rgba(234, 179, 8, 0.12)', color: '#ca8a04', padding: '4px 10px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 800 }}>
                                      {memberCount} {memberCount === 1 ? 'Mitglied' : 'Mitglieder'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', border: '2.5px dashed #cbd5e1', borderRadius: '20px' }}>
                              Bisher keine betreuten Bands in GrooveLab.
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: width < 800 ? '1fr' : '1.5fr 1fr', gap: '24px', paddingBottom: '32px' }}>
                    {/* Wochen-Planner */}
                    <div className="glass-panel" style={{ background: 'white', borderRadius: '32px', padding: '32px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                        <div>
                          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ color: '#f59e0b' }}><Clock size={24} /></div>
                            Wochen-Planner
                            {((user as any)?.role?.toLowerCase() === 'admin' || (user as any)?.role?.toLowerCase() === 'teacher') && (
                              <button 
                                onClick={async () => {
                                  if (window.confirm('VORSICHT: Möchtest du wirklich ALLE Wochenplan-Einträge für diese Schule löschen?')) {
                                    const schoolData = Array.isArray((user as any)?.schools) ? (user as any)?.schools[0] : (user as any)?.schools;
                                    if (!schoolData?.id) return;
                                    const { error } = await supabase.from('lab_planning').delete().eq('school_id', schoolData.id);
                                    if (error) alert('Fehler: ' + error.message);
                                    else {
                                      alert('Wochenplan wurde auf 0 zurückgesetzt! ✅');
                                      if (fetchPlanningData) fetchPlanningData(schoolData.id);
                                    }
                                  }
                                }}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', opacity: 0.6 }}
                                title="Wochenplan komplett leeren (Admin)"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </h3>
                          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Trage deine Präsenzzeiten ein, damit Schüler dich im Lab antreffen.</p>
                        </div>
                        {/* Legend */}
                        {(() => {
                          const activeTeachers = teachers.filter(t => {
                            const isActiveOnPlatform = activePlatform === 'campus' ? t.is_campus_active : t.is_groovelab_active;
                            return isActiveOnPlatform && t.is_observer !== true;
                          });
                          return (
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', background: '#f8fafc', padding: '10px 16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                              {activeTeachers.map(t => {
                                const isMe = t.id === user?.id;
                                const name = t.first_name || '';
                                const theme = getTeacherTheme(name, t.id);
                                return (
                                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>
                                    <div style={{ 
                                      width: '12px', 
                                      height: '12px', 
                                      borderRadius: '3px', 
                                      background: isMe ? theme.solidBg : theme.lightBg, 
                                      border: isMe ? `1px solid ${theme.solidBorder}` : `1px dashed ${theme.lightBorder}`
                                    }}></div> {name} {isMe ? '(Du)' : ''}
                                  </div>
                                );
                              })}
                              {activeTeachers.length > 1 && (() => {
                                const sortedActive = [...activeTeachers].sort((a, b) => {
                                  const nameA = a.first_name || '';
                                  const nameB = b.first_name || '';
                                  return nameA.localeCompare(nameB, 'de-DE');
                                });
                                const theme1 = getTeacherTheme(sortedActive[0].first_name || '', sortedActive[0].id);
                                const theme2 = getTeacherTheme(sortedActive[1].first_name || '', sortedActive[1].id);
                                return (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>
                                    <div style={{ 
                                      width: '12px', 
                                      height: '12px', 
                                      borderRadius: '3px', 
                                      background: `linear-gradient(135deg, ${theme1.solidBg} 0%, ${theme2.solidBg} 100%)`, 
                                      border: '1px solid #cbd5e1'
                                    }}></div> {activeTeachers.length === 2 ? 'Beide' : 'Mehrere'}
                                  </div>
                                );
                              })()}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(79, 70, 229, 0.4)' }}></div> Lab voll
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                       {(() => {
                          const schoolData = Array.isArray((user as any)?.schools) ? (user as any)?.schools[0] : (user as any)?.schools;
                          const hours = schoolData?.opening_hours || {};
                          
                          const dayConfigs = [
                            { id: 'Mo', key: 'monday' },
                            { id: 'Di', key: 'tuesday' },
                            { id: 'Mi', key: 'wednesday' },
                            { id: 'Do', key: 'thursday' },
                            { id: 'Fr', key: 'friday' },
                            { id: 'Sa', key: 'saturday' },
                            { id: 'So', key: 'sunday' }
                          ];

                          const activeDays = dayConfigs.filter(d => hours[d.key]?.active !== false);
                          
                          if (activeDays.length === 0) {
                            return <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '0.8rem' }}>Keine Öffnungszeiten im Setup hinterlegt.</div>;
                          }

                          let minH = 22;
                          let maxH = 0;
                          activeDays.forEach(d => {
                            const h = hours[d.key];
                            if (h?.start) minH = Math.min(minH, parseInt(h.start.split(':')[0]));
                            if (h?.end) maxH = Math.max(maxH, parseInt(h.end.split(':')[0]));
                          });

                          if (minH > 21) minH = 8;
                          if (maxH < 1) maxH = 20;

                          return (
                            <>
                              <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(${activeDays.length}, 1fr)`, gap: '6px', border: '1px solid #f1f5f9', background: '#f8fafc', padding: '12px', borderRadius: '24px' }}>
                                <div style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: 800, color: '#cbd5e1' }}></div>
                                {activeDays.map(d => (
                                  <div key={d.id} style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: 800, color: '#64748b' }}>{d.id}</div>
                                ))}

                                {(() => {
                                  let minTime = "23:59";
                                  let maxTime = "00:00";
                                  activeDays.forEach(d => {
                                    const h = hours[d.key];
                                    if (h?.active !== false && h?.start && h.start < minTime) minTime = h.start;
                                    if (h?.active !== false && h?.end && h.end > maxTime) maxTime = h.end;
                                  });

                                  if (minTime === "23:59") minTime = "16:00";
                                  if (maxTime === "00:00") maxTime = "20:00";

                                  const timeRows = [];
                                  let current = minTime;

                                  // Helper to add 15 minutes to HH:mm string
                                  const add15 = (t: string) => {
                                    let [h, m] = t.split(':').map(Number);
                                    m += 15;
                                    if (m >= 60) { h += 1; m = 0; }
                                    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                                  };

                                  while (current < maxTime) {
                                    const time = current;
                                    timeRows.push(
                                      <React.Fragment key={time}>
                                        <div style={{ fontSize: '0.6rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', fontWeight: 600 }}>{time}</div>
                                        {activeDays.map(day => {
                                          const key = `${day.id}-${time}`;
                                          const isPlanned = plannedSlots.includes(key);
                                          
                                          // Exclude teachers from student count
                                          const totalCount = globalPlannedSlots.filter(s => 
                                            s.day === day.id && 
                                            s.time === time && 
                                            s.profiles?.role?.toLowerCase() !== 'teacher' && 
                                            s.profiles?.role?.toLowerCase() !== 'admin'
                                          ).length;

                                          const teachersInSlot = globalPlannedSlots.filter(s => 
                                            s.day === day.id && 
                                            s.time === time && 
                                            (s.profiles?.role?.toLowerCase() === 'teacher' || s.profiles?.role?.toLowerCase() === 'admin')
                                          );
                                          const hasMySlot = isPlanned;
                                          const hasOtherTeacher = teachersInSlot.some(t => t.user_id !== loggedInUserId);

                                          const dayHours = hours[day.key];
                                          const isOpen = dayHours?.active && time >= dayHours.start && time < dayHours.end;

                                          let bgColor = 'white';
                                          let textColor = '#64748b';
                                          let border = '1px solid #f1f5f9';
                                          let cursor = 'pointer';
                                          let content: any = '';

                                          if (!isOpen) {
                                            bgColor = '#f1f5f9';
                                            textColor = '#cbd5e1';
                                            cursor = 'not-allowed';
                                            content = <span style={{ opacity: 0.3, fontSize: '0.6rem' }}>✕</span>;
                                          } else {
                                            // 1. Determine Background, Border, and Text Color based strictly on heatmap density and coach presence
                                            if (teachersInSlot.length > 0) {
                                              const styleDetails = getTeacherColorStyle(teachersInSlot, loggedInUserId || undefined);
                                              bgColor = styleDetails.bgColor;
                                              textColor = styleDetails.textColor;
                                              border = styleDetails.border;
                                            }

                                            // 2. Determine Inner Content (Teachers' initials)
                                            if (teachersInSlot.length > 0) {
                                              const sortedTeachers = [...teachersInSlot].sort((a, b) => {
                                                const nameA = a.profiles?.first_name || '';
                                                const nameB = b.profiles?.first_name || '';
                                                return nameA.localeCompare(nameB, 'de-DE');
                                              });
                                              const initials = sortedTeachers
                                                .map(t => t.profiles?.first_name?.[0] || 'L')
                                                .join('+');
                                              content = (
                                                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: textColor }} title={sortedTeachers.map(t => t.profiles?.first_name).join(', ')}>
                                                  {initials}
                                                </span>
                                              );
                                            }
                                          }

                                          return (
                                            <button 
                                              key={`${day.id}-${time}`}
                                              onClick={() => {
                                                if (isOpen && toggleSlot) toggleSlot(day.id, time);
                                              }}
                                              style={{ 
                                                cursor: cursor, 
                                                height: '24px', 
                                                background: bgColor,
                                                borderRadius: '5px', 
                                                border: border,
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center', 
                                                color: textColor,
                                                fontSize: '0.65rem', 
                                                fontWeight: 900, 
                                                transition: 'all 0.1s',
                                                boxShadow: isPlanned ? `0 2px 8px ${bgColor}50` : 'none',
                                                opacity: isOpen ? 1 : 0.6,
                                                padding: 0,
                                                width: '100%',
                                                position: 'relative',
                                                zIndex: 10,
                                                pointerEvents: 'auto'
                                              }}>
                                              {content}
                                            </button>
                                          );
                                        })}
                                      </React.Fragment>
                                    );
                                    current = add15(current);
                                  }
                                  return timeRows;
                                })()}
                              </div>

                              {/* Teachers presence list under the grid */}
                              {(() => {
                                const teacherPresences = getTeacherPresenceList();
                                if (teacherPresences.length === 0) return null;
                                
                                const groupedPresences: { [teacherName: string]: typeof teacherPresences } = {};
                                teacherPresences.forEach(pres => {
                                  if (!groupedPresences[pres.teacherName]) {
                                    groupedPresences[pres.teacherName] = [];
                                  }
                                  groupedPresences[pres.teacherName].push(pres);
                                });

                                return (
                                  <div style={{ marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontSize: '1.1rem' }}>👨‍🏫</span>
                                      Anwesende Coaches diese Woche:
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                      {Object.entries(groupedPresences).map(([teacherName, presList]) => {
                                        const theme = getTeacherTheme(teacherName, '');
                                        const dotColor = theme.solidBg;
                                        return (
                                          <div key={teacherName} style={{ 
                                            display: 'flex', 
                                            alignItems: 'center',
                                            flexWrap: 'wrap',
                                            gap: '6px',
                                            background: '#f8fafc', 
                                            border: '1px solid #f1f5f9', 
                                            padding: '7px 12px', 
                                            borderRadius: '12px' 
                                          }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                                              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: dotColor }}></div>
                                              <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#1e293b' }}>{teacherName}</span>
                                            </div>
                                            <span style={{ color: '#cbd5e1', fontSize: '0.7rem' }}>·</span>
                                            {(presList as any[]).map((pres: any, idx: number) => (
                                              <span key={idx} style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                                                {idx > 0 && <span style={{ color: '#cbd5e1', marginRight: '4px' }}>·</span>}
                                                <span style={{ fontWeight: 800, color: '#1e293b' }}>{pres.day}.</span> {pres.rangeStr}
                                              </span>
                                            ))}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}
                            </>
                          );
                        })()}
                    </div>

                    {/* Coached Bands */}
                    <div className="glass-panel" style={{ background: 'white', borderRadius: '32px', padding: '32px' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ color: '#ec4899' }}><Users size={24} /></div>
                        Meine betreuten Bands
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {(() => {
                          const coachedBands = (allBands || []).filter((b: any) => b.coach_id === user.id);
                          if (coachedBands.length === 0) {
                            return <div style={{ textAlign: 'center', padding: '40px 0', color: '#cbd5e1' }}>Du betreust aktuell keine Bands.</div>;
                          }
                          return coachedBands.map((b: any) => (
                            <button 
                              key={b.id} 
                              className="hover-card" 
                              onClick={() => {
                                onOpenBandProfile(b);
                              }}
                              style={{ width: '100%', textAlign: 'left', cursor: 'pointer', padding: '24px', background: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9', display: 'flex', gap: '20px', alignItems: 'center', transition: 'all 0.2s' }}>
                              {renderBandAvatar(b.name, b.photo_url, '64px', '18px')}
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>{b.name}</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>
                                  {b.songs?.title || b.band_songs?.[0]?.songs?.title || b.genre || 'Jam Session'}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                  <div style={{ display: 'flex', gap: '0' }}>
                                    {b.band_members?.slice(0, 5).map((m: any, idx: number) => {
                                      const u = Array.isArray(m.users) ? m.users[0] : m.users;
                                      return (
                                        <div key={idx} style={{ 
                                          width: '28px', 
                                          height: '28px', 
                                          borderRadius: '50%', 
                                          border: '2px solid white', 
                                          marginLeft: idx === 0 ? 0 : '-10px', 
                                          overflow: 'hidden', 
                                          background: m.user_id ? '#f1f5f9' : '#000000',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          zIndex: 5 - idx
                                        }}>
                                          {m.user_id ? (
                                            <StudioAvatar src={u?.photo_url} user={u} />
                                          ) : (
                                            <span style={{ color: 'white', fontSize: '0.6rem', fontWeight: 900 }}>{m.external_name?.[0] || 'E'}</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ));
                        })()}
                      </div>
                    </div>
                    {/* Legal Footer for Mobile / Profile Page */}
                    <div style={{
                      marginTop: '24px',
                      padding: '24px 0',
                      borderTop: '1px solid #f1f5f9',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', gap: '20px', fontSize: '0.85rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <span 
                          role="button"
                          tabIndex={0}
                          onClick={onOpenPrivacy} 
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenPrivacy(); } }}
                          style={{ cursor: 'pointer', outline: 'none', borderRadius: '4px', padding: '2px 4px' }}
                          onFocus={(e) => { e.currentTarget.style.color = '#334155'; }}
                          onBlur={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                        >Datenschutz</span>
                        <span style={{ opacity: 0.5 }}>•</span>
                        <span 
                          role="button"
                          tabIndex={0}
                          onClick={onOpenAgb} 
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenAgb(); } }}
                          style={{ cursor: 'pointer', outline: 'none', borderRadius: '4px', padding: '2px 4px' }}
                          onFocus={(e) => { e.currentTarget.style.color = '#334155'; }}
                          onBlur={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                        >AGB</span>
                        <span style={{ opacity: 0.5 }}>•</span>
                        <span 
                          role="button"
                          tabIndex={0}
                          onClick={onOpenCancellation} 
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenCancellation(); } }}
                          style={{ cursor: 'pointer', outline: 'none', borderRadius: '4px', padding: '2px 4px' }}
                          onFocus={(e) => { e.currentTarget.style.color = '#334155'; }}
                          onBlur={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                        >Widerruf</span>
                        <span style={{ opacity: 0.5 }}>•</span>
                        <span 
                          role="button"
                          tabIndex={0}
                          onClick={onOpenImpressum} 
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenImpressum(); } }}
                          style={{ cursor: 'pointer', outline: 'none', borderRadius: '4px', padding: '2px 4px' }}
                          onFocus={(e) => { e.currentTarget.style.color = '#334155'; }}
                          onBlur={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                        >Impressum</span>
                        <span style={{ opacity: 0.5 }}>•</span>
                        <span 
                          role="button"
                          tabIndex={0}
                          onClick={onOpenAccessibility} 
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenAccessibility(); } }}
                          style={{ cursor: 'pointer', outline: 'none', borderRadius: '4px', padding: '2px 4px' }}
                          onFocus={(e) => { e.currentTarget.style.color = '#334155'; }}
                          onBlur={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                        >Barrierefreiheit</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}><CampusGroovelabText fontSize="0.7rem" fontWeight={600} /> © {new Date().getFullYear()}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

  );
};

export default GrooveLabProfileView;
