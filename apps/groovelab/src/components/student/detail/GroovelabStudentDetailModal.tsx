import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  X, Flame, Zap, Music, Radio, LogOut, Check, Sliders, 
  Award, Sparkles, AlertCircle, RefreshCw, Disc
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { resolveCampusStudentAvatar } from '../../../utils/avatarHelper';
import { SkillRadarPentagon } from '../../common/SkillRadarPentagon';

export interface GroovelabStudentDetailModalProps {
  student: any;
  onClose: () => void;
  onOpenBandProfile?: (band: any) => void;
  callerDashboard?: string;
}

export const GroovelabStudentDetailModal: React.FC<GroovelabStudentDetailModalProps> = ({
  student,
  onClose,
  onOpenBandProfile,
  callerDashboard = 'teacher'
}) => {
  const studentId = student?.id || student?.user_id;

  // 1. Identitätsdaten (Zero-Campus PII-Leakage)
  const firstName = useMemo(() => {
    return (student?.first_name || (student?.name ? student.name.split(' ')[0] : '') || '').trim();
  }, [student]);

  const lastName = useMemo(() => {
    return (student?.last_name || (student?.name && student.name.split(' ').length > 1 ? student.name.split(' ').slice(1).join(' ') : '') || '').trim();
  }, [student]);

  const displayName = useMemo(() => {
    if (firstName && lastName) {
      return `${firstName} ${lastName.charAt(0).toUpperCase()}.`;
    }
    return firstName || 'GrooveLab Schüler';
  }, [firstName, lastName]);

  const studentUiLevel = useMemo<'junior' | 'teen' | 'pro'>(() => {
    const local = typeof window !== 'undefined' && studentId ? localStorage.getItem(`campus_student_ui_level_${studentId}`) : null;
    return (local || student?.campus_ui_level || 'teen') as 'junior' | 'teen' | 'pro';
  }, [studentId, student]);

  // 2. State für GrooveLab-Metriken
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [activeSongs, setActiveSongs] = useState<any[]>([]);
  const [freeStations, setFreeStations] = useState<any[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string>('');
  const [isSwitchingStation, setIsSwitchingStation] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(student?.session || null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 3. 5-Säulen Skill-Radar State
  const [pillarLevels, setPillarLevels] = useState<Record<string, number>>(() => {
    try {
      const dbLevels = student?.skill_radar_levels;
      if (dbLevels && typeof dbLevels === 'object') {
        return {
          rhythmus: Number(dbLevels.rhythmus || 1),
          technik: Number(dbLevels.technik || 1),
          klang: Number(dbLevels.klang || dbLevels.intonation || 1),
          ausdruck: Number(dbLevels.ausdruck || 1),
          repertoire: Number(dbLevels.repertoire || 1)
        };
      }
      const savedOverride = typeof window !== 'undefined' && studentId ? localStorage.getItem(`groovelab_skill_overrides_${studentId}`) : null;
      if (savedOverride) {
        const parsed = JSON.parse(savedOverride);
        return {
          rhythmus: Number(parsed.rhythmus || 1),
          technik: Number(parsed.technik || 1),
          klang: Number(parsed.klang || 1),
          ausdruck: Number(parsed.ausdruck || 1),
          repertoire: Number(parsed.repertoire || 1)
        };
      }
    } catch (e) {
      // Fallback
    }
    return { rhythmus: 1, technik: 1, klang: 1, ausdruck: 1, repertoire: 1 };
  });

  const [activeWeeklyFocus, setActiveWeeklyFocus] = useState<string>(() => {
    return student?.weekly_focus_tag || 'ausgeglichen';
  });

  // ♿ BFSG 2025 / WCAG 2.2 AA: Escape-Taste schließt Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Daten laden (GrooveLab-Only)
  const loadGroovelabData = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      // 1. Stats laden (XP, Streaks, Focus)
      const { data: stData } = await supabase
        .from('student_stats')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();
      if (stData) setStats(stData);

      // 2. Aktive Session & Station ermitteln falls nicht im Prop
      const { data: sessData } = await supabase
        .from('sessions')
        .select('*, stations(*)')
        .eq('user_id', studentId)
        .is('check_out_time', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessData) {
        setActiveSession(sessData);
      }

      // 3. Freie Stationen im gleichen Raum für Umsetzen laden
      if (sessData?.stations?.room_id) {
        const { data: roomStations } = await supabase
          .from('stations')
          .select('*')
          .eq('room_id', sessData.stations.room_id)
          .neq('id', sessData.station_id);

        if (roomStations) {
          // Prüfen welche Stationen nicht belegt sind
          const { data: occupied } = await supabase
            .from('sessions')
            .select('station_id')
            .is('check_out_time', null);
          const occupiedIds = new Set((occupied || []).map(o => o.station_id));
          setFreeStations(roomStations.filter(s => !occupiedIds.has(s.id)));
        }
      }

      // 4. GrooveLab Song-Fortschritt
      const { data: progData } = await supabase
        .from('progress_matrix')
        .select('*, songs(id, title, artist, tempo_bpm, genre)')
        .eq('user_id', studentId)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (progData) {
        setActiveSongs(progData);
      }
    } catch (err) {
      console.error('[GroovelabStudentDetailModal] Data load error:', err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadGroovelabData();
  }, [loadGroovelabData]);

  // Wochenfokus ändern (Lehrer-Aktion)
  const handleSetWeeklyFocus = async (focusKey: string) => {
    setActiveWeeklyFocus(focusKey);
    try {
      await supabase.from('users').update({ weekly_focus_tag: focusKey }).eq('id', studentId);
      setToastMessage(`Wochenfokus auf "${focusKey}" gesetzt`);
      setTimeout(() => setToastMessage(null), 2500);
    } catch (err) {
      console.error('Failed to update weekly focus:', err);
    }
  };

  // Station umsetzen (Lehrer-Aktion)
  const handleSwitchStation = async () => {
    if (!selectedStationId || !activeSession) return;
    setIsSwitchingStation(true);
    const now = new Date().toISOString();
    try {
      // Aktuelle Session beenden mit Flag
      await supabase
        .from('sessions')
        .update({ check_out_time: now, metadata: { is_switching_station: true } })
        .eq('id', activeSession.id);

      // Neue Session anlegen
      const { data: newSess, error } = await supabase
        .from('sessions')
        .insert({
          user_id: studentId,
          station_id: selectedStationId,
          check_in_time: now,
          gps_verified: true
        })
        .select('*, stations(*)')
        .single();

      if (error) throw error;
      setActiveSession(newSess);
      setSelectedStationId('');
      setToastMessage('Station erfolgreich gewechselt');
      setTimeout(() => setToastMessage(null), 2500);
      loadGroovelabData();
    } catch (err: any) {
      alert('Fehler beim Station-Wechsel: ' + (err?.message || String(err)));
    } finally {
      setIsSwitchingStation(false);
    }
  };

  // Schüler ausbuchen (Lehrer-Aktion)
  const handleCheckoutStudent = async () => {
    if (!activeSession) return;
    setIsCheckingOut(true);
    try {
      await supabase
        .from('sessions')
        .update({ check_out_time: new Date().toISOString() })
        .eq('id', activeSession.id);

      // Dispatch Realtime Remote-Checkout Event für das Schülergerät
      window.dispatchEvent(new CustomEvent('groovelab_remote_checkout', {
        detail: { sessionId: activeSession.id, userId: studentId }
      }));

      setActiveSession(null);
      setToastMessage('Schüler erfolgreich ausgebucht');
      setTimeout(() => {
        setToastMessage(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      alert('Fehler beim Ausbuchen: ' + (err?.message || String(err)));
      setIsCheckingOut(false);
    }
  };

  const avatarSrc = useMemo(() => {
    return resolveCampusStudentAvatar(student);
  }, [student]);

  return (
    <div 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="groovelab-student-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        style={{
          background: '#ffffff',
          borderRadius: '28px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid rgba(251, 188, 5, 0.2)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header mit GrooveLab Yellow Identity */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          padding: '24px 28px',
          position: 'relative',
          borderBottom: '2px solid #facc15',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap'
        }}>
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Modal schließen"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s',
              touchAction: 'manipulation'
            }}
          >
            <X size={20} />
          </button>

          {/* Student Avatar */}
          <div style={{
            width: '76px',
            height: '76px',
            borderRadius: '50%',
            border: '3px solid #facc15',
            background: '#ffffff',
            boxShadow: '0 8px 20px rgba(250, 204, 21, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            <img 
              src={avatarSrc} 
              alt={displayName} 
              style={{ width: '90%', height: '90%', objectFit: 'contain' }} 
            />
          </div>

          {/* Identity & Tags */}
          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <span style={{
                background: '#facc15',
                color: '#0f172a',
                padding: '3px 10px',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: 900,
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}>
                GrooveLab Live
              </span>
              <span style={{
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#e2e8f0',
                padding: '3px 10px',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase'
              }}>
                Level {studentUiLevel.toUpperCase()}
              </span>
              {activeSession?.stations?.name && (
                <span style={{
                  background: 'rgba(34, 197, 94, 0.15)',
                  color: '#4ade80',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  padding: '3px 10px',
                  borderRadius: '8px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Radio size={12} /> {activeSession.stations.name}
                </span>
              )}
            </div>

            <h2 
              id="groovelab-student-modal-title"
              style={{ 
                fontSize: '22px', 
                fontWeight: 900, 
                color: '#ffffff', 
                margin: '0 0 6px 0',
                letterSpacing: '-0.02em' 
              }}
            >
              {displayName}
            </h2>

            {/* Instrument Badges */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(student?.instrument || 'Schlagzeug').split(',').map((inst: string) => inst.trim()).filter(Boolean).map((inst: string) => (
                <span 
                  key={inst}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#94a3b8',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  {inst}
                </span>
              ))}
            </div>
          </div>

          {/* Quick Metrics (XP & Flames) */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '14px',
              padding: '8px 14px',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#f87171' }}>
                <Flame size={16} fill="#f87171" />
                <span style={{ fontSize: '16px', fontWeight: 900 }}>{stats?.current_streak_weeks || stats?.streak_weeks || 1}</span>
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#fca5a5', textTransform: 'uppercase' }}>Streak</span>
            </div>

            <div style={{
              background: 'rgba(250, 204, 21, 0.15)',
              border: '1px solid rgba(250, 204, 21, 0.3)',
              borderRadius: '14px',
              padding: '8px 14px',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#facc15' }}>
                <Zap size={16} fill="#facc15" />
                <span style={{ fontSize: '16px', fontWeight: 900 }}>{stats?.total_xp || 0}</span>
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#fde047', textTransform: 'uppercase' }}>XP</span>
            </div>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div style={{
          padding: '24px 28px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          background: '#f8fafc'
        }}>
          {toastMessage && (
            <div style={{
              padding: '10px 16px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '12px',
              color: '#065f46',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Check size={16} />
              {toastMessage}
            </div>
          )}

          {/* Section 1: Skill-Radar Pentagramm (5 Säulen) */}
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0' }}>
                  GrooveLab Kompetenz-Radar
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                  5 didaktische Säulen – Klicke eine Säule, um den Wochenschwerpunkt zu setzen.
                </p>
              </div>
              {activeWeeklyFocus && activeWeeklyFocus !== 'ausgeglichen' && (
                <span style={{
                  background: 'rgba(250, 204, 21, 0.15)',
                  color: '#854d0e',
                  border: '1px solid #facc15',
                  padding: '4px 10px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 800
                }}>
                  🎯 Fokus: {activeWeeklyFocus}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <SkillRadarPentagon
                levels={pillarLevels}
                activeFocusTags={activeWeeklyFocus !== 'ausgeglichen' ? [activeWeeklyFocus] : []}
                size="compact"
                uiLevel={studentUiLevel}
                studentName={firstName || 'Schüler'}
                instrumentName={student?.instrument || 'Schlagzeug'}
                onSkillClick={(tagKey) => {
                  handleSetWeeklyFocus(activeWeeklyFocus === tagKey ? 'ausgeglichen' : tagKey);
                }}
              />
            </div>
          </div>

          {/* Section 2: Aktive Songs & Fortschritt */}
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Music size={16} color="#eab308" /> Aktive GrooveLab Songs & Übungen
            </h3>

            {activeSongs.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
                Noch keine Songs in der Übungsmatrix hinterlegt.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activeSongs.map((prog, idx) => (
                  <div 
                    key={prog.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Disc size={18} color="#64748b" />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                          {prog.songs?.title || 'Song ohne Titel'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {prog.songs?.artist || 'GrooveLab Track'} {prog.songs?.tempo_bpm ? `• ${prog.songs.tempo_bpm} BPM` : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {prog.is_mastered && (
                        <span style={{
                          background: 'rgba(34, 197, 94, 0.1)',
                          color: '#15803d',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          Meister
                        </span>
                      )}
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                        {prog.mastery_percentage || prog.progress_percent || 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Live Lab Stations-Steuerung (Lehrer-Aktionen) */}
          {callerDashboard === 'teacher' && activeSession && (
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio size={16} color="#3b82f6" /> Stations-Steuerung Live Lab
              </h3>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Station umsetzen */}
                {freeStations.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, minWidth: '220px' }}>
                    <select
                      value={selectedStationId}
                      onChange={(e) => setSelectedStationId(e.target.value)}
                      aria-label="Freie Station zum Umsetzen wählen"
                      style={{
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13px',
                        fontWeight: 600,
                        background: '#ffffff',
                        color: '#1e293b',
                        flex: 1
                      }}
                    >
                      <option value="">Freie Station wählen...</option>
                      {freeStations.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={!selectedStationId || isSwitchingStation}
                      onClick={handleSwitchStation}
                      aria-label="Schüler auf gewählte Station umsetzen"
                      style={{
                        padding: '10px 16px',
                        borderRadius: '12px',
                        background: selectedStationId ? '#3b82f6' : '#e2e8f0',
                        color: selectedStationId ? '#ffffff' : '#94a3b8',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: selectedStationId ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        touchAction: 'manipulation'
                      }}
                    >
                      <RefreshCw size={14} className={isSwitchingStation ? 'animate-spin' : ''} />
                      Umsetzen
                    </button>
                  </div>
                )}

                {/* 1-Klick Auschecken */}
                <button
                  type="button"
                  disabled={isCheckingOut}
                  onClick={handleCheckoutStudent}
                  aria-label="Schüler jetzt ausbuchen"
                  style={{
                    padding: '10px 18px',
                    borderRadius: '12px',
                    background: '#fef2f2',
                    border: '1px solid #fee2e2',
                    color: '#dc2626',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    touchAction: 'manipulation',
                    boxShadow: '0 2px 4px rgba(220, 38, 38, 0.05)'
                  }}
                >
                  <LogOut size={14} />
                  Ausbuchen
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 28px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            style={{
              padding: '10px 24px',
              borderRadius: '12px',
              background: '#f1f5f9',
              border: 'none',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              touchAction: 'manipulation'
            }}
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
export default GroovelabStudentDetailModal;
