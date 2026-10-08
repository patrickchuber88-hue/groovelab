import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Trophy, 
  Target, 
  Eye, 
  EyeOff, 
  Pencil, 
  Music, 
  Crown, 
  Timer,
  Sliders,
  Mic,
  Activity
} from 'lucide-react';
import { StudentNicknameSetupModal } from '../student/modals/StudentNicknameSetupModal';
import { supabase } from '../../lib/supabase';

export type EarDiscipline = 'intervals' | 'chords' | 'pitch_match';
export type EarVdmLevel = 'junior' | 'd1' | 'd2' | 'd3';

export interface EarLeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  instrument: string;
  score: number;
  accuracy: number;
  maxStreak: number;
  avgResponseTimeMs: number;
  isCurrentUser?: boolean;
  isGhost?: boolean;
}

export interface EarLeaderboardWidgetProps {
  selectedDiscipline?: EarDiscipline;
  selectedLevel?: EarVdmLevel;
  onSelectDiscipline?: (disc: EarDiscipline) => void;
  onSelectLevel?: (lvl: EarVdmLevel) => void;
  student?: any;
  latestSession?: {
    discipline: EarDiscipline;
    vdmLevel: EarVdmLevel;
    score: number;
    accuracy: number;
    streak: number;
    avgResponseTimeMs: number;
  } | null;
  showHeader?: boolean;
}

const DISCIPLINE_TABS: { id: EarDiscipline; label: string; icon: any }[] = [
  { id: 'intervals', label: 'Intervalle', icon: Music },
  { id: 'chords', label: 'Akkorde', icon: Sliders },
  { id: 'pitch_match', label: 'Pitch-Match', icon: Mic }
];

const VDM_LEVEL_TABS: { id: EarVdmLevel; label: string; sub: string }[] = [
  { id: 'junior', label: 'Junior', sub: 'Vorstufe' },
  { id: 'd1', label: 'D1', sub: 'Bronze' },
  { id: 'd2', label: 'D2', sub: 'Silber' },
  { id: 'd3', label: 'D3', sub: 'Gold' }
];

export const EarLeaderboardWidget: React.FC<EarLeaderboardWidgetProps> = ({
  selectedDiscipline: propDiscipline,
  selectedLevel: propLevel,
  onSelectDiscipline,
  onSelectLevel,
  student,
  latestSession,
  showHeader = true
}) => {
  const [activeDiscipline, setActiveDiscipline] = useState<EarDiscipline>(propDiscipline || 'intervals');
  const [activeLevel, setActiveLevel] = useState<EarVdmLevel>(propLevel || 'd1');

  useEffect(() => {
    if (propDiscipline) setActiveDiscipline(propDiscipline);
  }, [propDiscipline]);

  useEffect(() => {
    if (propLevel) setActiveLevel(propLevel);
  }, [propLevel]);

  const schoolName = student?.school_name || student?.schools?.name || 'Musikschule';
  const studentInstrument = student?.instrument || 'Musiker';

  // Filter: 'school' (Gesamte Schule) vs. 'instrument' (Nur eigenes Instrument)
  const [filterMode, setFilterMode] = useState<'school' | 'instrument'>('school');

  // Privacy by Default: Standardmäßig Ghost-Modus (is_public = false)
  const [isPublic, setIsPublic] = useState<boolean>(() => {
    if (typeof localStorage !== 'undefined' && student?.id) {
      const saved = localStorage.getItem(`cg_student_ranking_public_${student.id}`);
      if (saved !== null) {
        try { return JSON.parse(saved); } catch (_) {}
      }
    }
    return false;
  });

  const [studentNickname, setStudentNickname] = useState<string>(() => {
    if (student?.nickname && typeof student.nickname === 'string') return student.nickname;
    if (typeof localStorage !== 'undefined' && student?.id) {
      const saved = localStorage.getItem(`cg_student_ranking_nickname_${student.id}`);
      if (saved) return saved;
    }
    return '';
  });

  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [dbEntries, setDbEntries] = useState<EarLeaderboardEntry[]>([]);
  const [isLoadingScores, setIsLoadingScores] = useState<boolean>(false);

  // Lade Ranking-Profil
  useEffect(() => {
    if (!student?.id) return;
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase.rpc('get_student_ranking_profile', {
          p_user_id: student.id
        });
        if (data && !error) {
          if (data.nickname) {
            setStudentNickname(data.nickname);
            localStorage.setItem(`cg_student_ranking_nickname_${student.id}`, data.nickname);
          }
          if (typeof data.is_public === 'boolean') {
            setIsPublic(data.is_public);
            localStorage.setItem(`cg_student_ranking_public_${student.id}`, JSON.stringify(data.is_public));
          }
        }
      } catch (_) {}
    };
    fetchProfile();
  }, [student?.id]);

  // Lade Ranglisten-Daten aus autoritativem RPC
  const loadLeaderboardData = useCallback(async () => {
    setIsLoadingScores(true);
    try {
      const instrumentParam = filterMode === 'instrument' ? studentInstrument : null;
      const { data, error } = await supabase.rpc('get_school_ear_leaderboard', {
        p_discipline: activeDiscipline,
        p_vdm_level: activeLevel,
        p_instrument: instrumentParam,
        p_school_id: student?.school_id || null
      });

      if (!error && Array.isArray(data)) {
        setDbEntries(data);
      } else {
        setDbEntries([]);
      }
    } catch (err) {
      console.warn('[EarLeaderboard] Error loading live scores:', err);
      setDbEntries([]);
    } finally {
      setIsLoadingScores(false);
    }
  }, [activeDiscipline, activeLevel, filterMode, student?.school_id, studentInstrument]);

  useEffect(() => {
    loadLeaderboardData();
  }, [loadLeaderboardData]);

  // Live-Reaktivität nach geübter Session
  useEffect(() => {
    const handleScoreRecorded = () => {
      loadLeaderboardData();
    };
    window.addEventListener('cg_ear_score_recorded', handleScoreRecorded);
    return () => window.removeEventListener('cg_ear_score_recorded', handleScoreRecorded);
  }, [loadLeaderboardData]);

  // Lokaler PR Cache
  const prStorageKey = `cg_ear_pr_${student?.id}_${activeDiscipline}_${activeLevel}`;
  const [personalRecord, setPersonalRecord] = useState<{ score: number; accuracy: number; streak: number; avgResponseTimeMs: number } | null>(() => {
    if (typeof localStorage !== 'undefined' && student?.id) {
      const saved = localStorage.getItem(`cg_ear_pr_${student.id}_${activeDiscipline}_${activeLevel}`);
      if (saved) {
        try { return JSON.parse(saved); } catch (_) {}
      }
    }
    return null;
  });

  useEffect(() => {
    if (typeof localStorage !== 'undefined' && student?.id) {
      const saved = localStorage.getItem(prStorageKey);
      if (saved) {
        try { setPersonalRecord(JSON.parse(saved)); } catch (_) {}
      } else {
        setPersonalRecord(null);
      }
    }
  }, [prStorageKey, student?.id]);

  // Aktualisiere persönlichen Rekord bei neuer Session
  useEffect(() => {
    if (!latestSession || !student?.id) return;
    if (latestSession.discipline === activeDiscipline && latestSession.vdmLevel === activeLevel) {
      const current = personalRecord?.score || 0;
      if (latestSession.score > current) {
        const updated = {
          score: latestSession.score,
          accuracy: latestSession.accuracy,
          streak: latestSession.streak,
          avgResponseTimeMs: latestSession.avgResponseTimeMs
        };
        setPersonalRecord(updated);
        localStorage.setItem(prStorageKey, JSON.stringify(updated));
        setTimeout(() => loadLeaderboardData(), 200);
      }
    }
  }, [latestSession, activeDiscipline, activeLevel, student?.id, personalRecord, prStorageKey, loadLeaderboardData]);

  // Self-Inclusion Engine
  const effectiveEntries = useMemo<EarLeaderboardEntry[]>(() => {
    const list: EarLeaderboardEntry[] = [...dbEntries];
    const userAlreadyInDb = list.some(e => e.isCurrentUser);

    const userBestScore = personalRecord?.score || 0;

    if (!userAlreadyInDb && student?.id && userBestScore > 0) {
      const matchesFilter = filterMode === 'school' || 
        studentInstrument.toLowerCase() === (student?.instrument || 'Musiker').toLowerCase();

      if (matchesFilter) {
        list.push({
          id: `self-${student.id}`,
          rank: 0,
          name: studentNickname || 'Du (Privat)',
          instrument: studentInstrument,
          score: userBestScore,
          accuracy: personalRecord?.accuracy || 0,
          maxStreak: personalRecord?.streak || 0,
          avgResponseTimeMs: personalRecord?.avgResponseTimeMs || 0,
          isCurrentUser: true,
          isGhost: !isPublic
        });
      }
    }

    list.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      return b.maxStreak - a.maxStreak;
    });

    return list.slice(0, 10).map((entry, idx) => ({
      ...entry,
      rank: idx + 1
    }));
  }, [dbEntries, personalRecord, student?.id, student?.instrument, studentNickname, studentInstrument, filterMode, isPublic]);

  const handleTogglePublic = async () => {
    if (!isPublic) {
      if (!studentNickname) {
        setIsNicknameModalOpen(true);
        return;
      }
      setIsPublic(true);
      if (typeof localStorage !== 'undefined' && student?.id) {
        localStorage.setItem(`cg_student_ranking_public_${student.id}`, 'true');
      }
      try {
        await supabase.rpc('set_student_ranking_nickname', {
          p_nickname: studentNickname,
          p_is_public: true
        });
        loadLeaderboardData();
      } catch (_) {}
    } else {
      setIsPublic(false);
      if (typeof localStorage !== 'undefined' && student?.id) {
        localStorage.setItem(`cg_student_ranking_public_${student.id}`, 'false');
      }
      try {
        await supabase.rpc('set_student_ranking_nickname', {
          p_nickname: studentNickname || 'GhostEar',
          p_is_public: false
        });
        loadLeaderboardData();
      } catch (_) {}
    }
  };

  const handleSaveNicknameSuccess = (savedNickname: string, isPub: boolean) => {
    setStudentNickname(savedNickname);
    setIsPublic(isPub);
    if (typeof localStorage !== 'undefined' && student?.id) {
      localStorage.setItem(`cg_student_ranking_nickname_${student.id}`, savedNickname);
      localStorage.setItem(`cg_student_ranking_public_${student.id}`, JSON.stringify(isPub));
    }
    loadLeaderboardData();
  };

  const handleDisciplineClick = (disc: EarDiscipline) => {
    setActiveDiscipline(disc);
    if (onSelectDiscipline) onSelectDiscipline(disc);
  };

  const handleLevelClick = (lvl: EarVdmLevel) => {
    setActiveLevel(lvl);
    if (onSelectLevel) onSelectLevel(lvl);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      width: '100%',
      fontFamily: 'inherit',
      color: '#0f172a'
    }}>
      {showHeader && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '8px',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'none'
            }}>
              <Trophy size={18} strokeWidth={2.4} color="#ffffff" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 950, color: '#0f172a' }}>
                  Hall of Ear
                </h3>
                <span style={{
                  background: 'rgba(139, 92, 246, 0.12)',
                  color: '#7c3aed',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '100px'
                }}>
                  Live
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                {schoolName} • Gehör-Rangliste
              </p>
            </div>
          </div>

          {/* Privacy & Ghost-Mode Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={handleTogglePublic}
              aria-label={isPublic ? 'Öffentliches Ranking aktiv' : 'Ghost-Modus aktiv'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 10px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: isPublic ? '#f8fafc' : '#f1f5f9',
                color: isPublic ? '#0f172a' : '#64748b',
                fontSize: '0.68rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {isPublic ? <Eye size={12} strokeWidth={2.2} /> : <EyeOff size={12} strokeWidth={2.2} />}
              <span>{isPublic ? 'Öffentlich' : 'Ghost-Modus'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsNicknameModalOpen(true)}
              aria-label="Nickname bearbeiten"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer'
              }}
            >
              <Pencil size={12} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      )}

      {/* Disziplin-Tabs: 3 tonale Säulen */}
      <div
        role="tablist"
        aria-label="Hall of Ear Disziplinen"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '4px',
          background: '#f8fafc',
          padding: '3px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}
      >
        {DISCIPLINE_TABS.map(tab => {
          const isSel = activeDiscipline === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isSel}
              type="button"
              onClick={() => handleDisciplineClick(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '6px 4px',
                borderRadius: '9px',
                border: 'none',
                background: isSel ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' : 'transparent',
                color: isSel ? '#ffffff' : '#64748b',
                fontWeight: isSel ? 900 : 650,
                fontSize: '0.74rem',
                cursor: 'pointer',
                boxShadow: isSel ? '0 2px 8px rgba(139, 92, 246, 0.30)' : 'none',
                transition: 'all 0.12s ease'
              }}
            >
              <TabIcon size={13} strokeWidth={2.2} color={isSel ? '#ffffff' : '#94a3b8'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* VdM-Stufen (D1, D2, D3) & Filter (Schule vs. Instrument) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px'
      }}>
        <div style={{
          display: 'flex',
          gap: '3px',
          background: '#f1f5f9',
          padding: '3px',
          borderRadius: '10px'
        }}>
          {VDM_LEVEL_TABS.map(lvl => {
            const isSel = activeLevel === lvl.id;
            return (
              <button
                key={lvl.id}
                type="button"
                onClick={() => handleLevelClick(lvl.id)}
                style={{
                  padding: '3px 9px',
                  borderRadius: '7px',
                  border: 'none',
                  background: isSel ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' : 'transparent',
                  color: isSel ? '#ffffff' : '#64748b',
                  fontSize: '0.7rem',
                  fontWeight: isSel ? 900 : 650,
                  cursor: 'pointer',
                  boxShadow: isSel ? '0 2px 6px rgba(139, 92, 246, 0.25)' : 'none'
                }}
              >
                {lvl.label} <span style={{ fontSize: '0.62rem', opacity: isSel ? 0.9 : 0.7 }}>{lvl.sub}</span>
              </button>
            );
          })}
        </div>

        <div style={{
          display: 'flex',
          gap: '3px',
          background: '#f1f5f9',
          padding: '3px',
          borderRadius: '10px'
        }}>
          <button
            type="button"
            onClick={() => setFilterMode('school')}
            style={{
              padding: '3px 8px',
              borderRadius: '7px',
              border: 'none',
              background: filterMode === 'school' ? '#ffffff' : 'transparent',
              color: filterMode === 'school' ? '#0f172a' : '#64748b',
              fontSize: '0.68rem',
              fontWeight: filterMode === 'school' ? 800 : 600,
              cursor: 'pointer'
            }}
          >
            Schule
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('instrument')}
            style={{
              padding: '3px 8px',
              borderRadius: '7px',
              border: 'none',
              background: filterMode === 'instrument' ? '#ffffff' : 'transparent',
              color: filterMode === 'instrument' ? '#0f172a' : '#64748b',
              fontSize: '0.68rem',
              fontWeight: filterMode === 'instrument' ? 800 : 600,
              cursor: 'pointer'
            }}
          >
            {studentInstrument}
          </button>
        </div>
      </div>

      {/* Ranglisten-Tabelle */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        overflow: 'hidden'
      }}>
        {isLoadingScores ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.75rem' }}>
            Lade Rangliste...
          </div>
        ) : effectiveEntries.length === 0 ? (
          <div style={{ padding: '28px 16px', textAlign: 'center', color: '#64748b' }}>
            <Activity size={24} strokeWidth={1.5} color="#94a3b8" style={{ marginBottom: '6px' }} />
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
              Noch keine Einträge in {DISCIPLINE_TABS.find(d => d.id === activeDiscipline)?.label} ({activeLevel.toUpperCase()})
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.68rem', color: '#64748b' }}>
              Trainiere eine Runde, um den ersten Highscore der Musikschule aufzustellen!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {effectiveEntries.map((entry, index) => {
              const isFirst = entry.rank === 1;
              const isSecond = entry.rank === 2;
              const isThird = entry.rank === 3;
              const isCurrent = entry.isCurrentUser;

              return (
                <div
                  key={entry.id || index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderBottom: index < effectiveEntries.length - 1 ? '1px solid #f1f5f9' : 'none',
                    background: isCurrent ? 'rgba(15, 23, 42, 0.04)' : '#ffffff',
                    transition: 'background 0.12s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    {/* Rank Badge */}
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '0.72rem',
                      background: isFirst ? '#0f172a' : isSecond ? '#334155' : isThird ? '#475569' : '#f1f5f9',
                      color: isFirst || isSecond || isThird ? '#ffffff' : '#64748b',
                      flexShrink: 0
                    }}>
                      {isFirst ? <Crown size={13} strokeWidth={2.4} /> : entry.rank}
                    </div>

                    {/* Name & Instrument */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{
                          fontWeight: isCurrent ? 900 : 750,
                          fontSize: '0.78rem',
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {entry.name}
                        </span>
                        {entry.isGhost && (
                          <span style={{
                            fontSize: '0.58rem',
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: '100px',
                            background: '#f1f5f9',
                            color: '#64748b'
                          }}>
                            Ghost
                          </span>
                        )}
                        {isCurrent && !entry.isGhost && (
                          <span style={{
                            fontSize: '0.58rem',
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: '100px',
                            background: '#0f172a',
                            color: '#ffffff'
                          }}>
                            Du
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.64rem', color: '#64748b', fontWeight: 600 }}>
                        {entry.instrument}
                      </span>
                    </div>
                  </div>

                  {/* Metrics: Score, Accuracy, Streak, Response Time */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    {entry.avgResponseTimeMs > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#64748b', fontSize: '0.66rem' }}>
                        <Timer size={11} strokeWidth={2.2} />
                        <span>{(entry.avgResponseTimeMs / 1000).toFixed(1)}s</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#0f172a', fontSize: '0.7rem', fontWeight: 750 }}>
                      <Target size={11} strokeWidth={2.2} />
                      <span>{entry.accuracy}%</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end'
                    }}>
                      <span style={{
                        fontSize: '0.85rem',
                        fontWeight: 950,
                        color: '#0f172a'
                      }}>
                        {entry.score}
                      </span>
                      <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Punkte
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Nickname Modal */}
      {isNicknameModalOpen && (
        <StudentNicknameSetupModal
          isOpen={isNicknameModalOpen}
          onClose={() => setIsNicknameModalOpen(false)}
          currentNickname={studentNickname}
          isPublic={isPublic}
          studentFirstName={student?.first_name || ''}
          studentLastName={student?.last_name || ''}
          studentId={student?.id}
          onSaveSuccess={handleSaveNicknameSuccess}
        />
      )}
    </div>
  );
};
