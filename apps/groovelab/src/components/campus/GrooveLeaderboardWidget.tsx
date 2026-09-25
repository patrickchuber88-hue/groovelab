import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Trophy, 
  Flame, 
  Sparkles, 
  Target, 
  Play, 
  CircleDot,
  Eye, 
  EyeOff, 
  Pencil, 
  ShieldCheck, 
  Music, 
  Zap, 
  Shuffle, 
  Dices, 
  Sun, 
  School, 
  Guitar,
  Crown,
  Medal,
  Lock
} from 'lucide-react';
import { StudentNicknameSetupModal } from '../student/modals/StudentNicknameSetupModal';
import { supabase } from '../../lib/supabase';

export type RhythmLevel = 'viertel' | 'rock_mix' | 'synkopen' | 'galopp' | 'latin_bossa' | 'funk_master' | 'shuffle' | 'random_groove';

export interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  instrument: string;
  score?: number;
  accuracy: number;
  maxStreak: number;
  bpm: number;
  isCurrentUser?: boolean;
  isGhost?: boolean;
}

interface GrooveLeaderboardWidgetProps {
  selectedLevel: RhythmLevel;
  onSelectLevel: (lvl: RhythmLevel) => void;
  student?: any;
  onPlayLevel?: (lvl: RhythmLevel) => void;
  latestScore?: {
    level: RhythmLevel;
    score?: number;
    accuracy: number;
    streak: number;
    bpm: number;
  } | null;
  useNotebookLayout?: boolean;
  showHeader?: boolean;
}

const LEVEL_TABS: { id: RhythmLevel; label: string; icon: any; color: string }[] = [
  { id: 'viertel', label: '1. Viertel', icon: CircleDot, color: '#f59e0b' },
  { id: 'rock_mix', label: '2. Rock', icon: Music, color: '#10b981' },
  { id: 'synkopen', label: '3. Off-Beat', icon: Zap, color: '#6366f1' },
  { id: 'galopp', label: '4. Galopp', icon: Zap, color: '#ec4899' },
  { id: 'latin_bossa', label: '5. Bossa', icon: Sun, color: '#0ea5e9' },
  { id: 'funk_master', label: '6. Funk', icon: Sparkles, color: '#8b5cf6' },
  { id: 'shuffle', label: '7. Blues', icon: Shuffle, color: '#b45309' },
  { id: 'random_groove', label: '8. Mix', icon: Dices, color: '#d97706' }
];

export const GrooveLeaderboardWidget: React.FC<GrooveLeaderboardWidgetProps> = ({
  selectedLevel,
  onSelectLevel,
  student,
  onPlayLevel,
  latestScore,
  useNotebookLayout = false,
  showHeader = false
}) => {
  const schoolName = student?.school_name || student?.schools?.name || 'Musikschule';
  const studentInstrument = student?.instrument || 'Gitarre';

  // 🏛️ Filter: 'school' (Gesamte Schule) vs. 'instrument' (Nur eigenes Instrument)
  const [filterMode, setFilterMode] = useState<'school' | 'instrument'>('school');

  // 🛡️ Privacy by Default: Standardmäßig Ghost-Modus (is_public = false)
  const [isPublic, setIsPublic] = useState<boolean>(() => {
    if (typeof localStorage !== 'undefined' && student?.id) {
      const saved = localStorage.getItem(`cg_student_ranking_public_${student.id}`);
      if (saved !== null) {
        try { return JSON.parse(saved); } catch (_) {}
      }
    }
    return false;
  });

  // Revisionssicherer Musiker-Nickname
  const [studentNickname, setStudentNickname] = useState<string>(() => {
    if (student?.nickname && typeof student.nickname === 'string') return student.nickname;
    if (typeof localStorage !== 'undefined' && student?.id) {
      const saved = localStorage.getItem(`cg_student_ranking_nickname_${student.id}`);
      if (saved) return saved;
    }
    return '';
  });

  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [dbEntries, setDbEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoadingScores, setIsLoadingScores] = useState<boolean>(false);
  const [teacherNames, setTeacherNames] = useState<string[]>([]);

  // Load backend profile & school teacher names if available
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
      } catch (e) {
        // Silent fallback to local storage
      }
    };
    fetchProfile();

    // 🛡️ Lade Lehrkräfte & Verwaltungsmitarbeiter der Schule für den Jugendschutzfilter
    if (student?.school_id) {
      (async () => {
        try {
          const { data } = await supabase
            .from('users')
            .select('last_name, first_name')
            .eq('school_id', student.school_id)
            .in('role', ['teacher', 'admin', 'secretary']);
          if (Array.isArray(data)) {
            const names = data
              .flatMap(u => [u.last_name, u.first_name])
              .filter((n): n is string => Boolean(n && n.trim().length >= 3));
            setTeacherNames(Array.from(new Set(names)));
          }
        } catch (_) {}
      })();
    }
  }, [student?.id, student?.school_id]);

  // 🎯 Zero Dummy Architecture: Lade echte Ranglisten-Einträge aus Supabase
  const loadLeaderboardData = useCallback(async () => {
    setIsLoadingScores(true);
    try {
      const instrumentParam = filterMode === 'instrument' ? studentInstrument : null;
      const { data, error } = await supabase.rpc('get_school_groove_leaderboard', {
        p_level: selectedLevel,
        p_instrument: instrumentParam,
        p_school_id: student?.school_id || null
      });

      if (!error && Array.isArray(data)) {
        setDbEntries(data);
      } else {
        setDbEntries([]);
      }
    } catch (err) {
      console.warn('[GrooveLeaderboard] Error loading live scores:', err);
      setDbEntries([]);
    } finally {
      setIsLoadingScores(false);
    }
  }, [filterMode, selectedLevel, student?.school_id, studentInstrument]);

  useEffect(() => {
    loadLeaderboardData();
  }, [loadLeaderboardData]);

  // ⚡ Live-Event-Listener für sofortige Reaktivität nach einer Übesession
  useEffect(() => {
    const handleScoreRecorded = () => {
      loadLeaderboardData();
    };
    window.addEventListener('cg_groove_score_recorded', handleScoreRecorded);
    return () => window.removeEventListener('cg_groove_score_recorded', handleScoreRecorded);
  }, [loadLeaderboardData]);

  // Load and merge student personal highscore per level
  const [personalScores, setPersonalScores] = useState<Record<RhythmLevel, { accuracy: number; streak: number; bpm: number; score?: number }>>(() => {
    const initial: Record<RhythmLevel, { accuracy: number; streak: number; bpm: number; score?: number }> = {
      viertel: { accuracy: 0, streak: 0, bpm: 80, score: 0 },
      rock_mix: { accuracy: 0, streak: 0, bpm: 85, score: 0 },
      synkopen: { accuracy: 0, streak: 0, bpm: 90, score: 0 },
      galopp: { accuracy: 0, streak: 0, bpm: 85, score: 0 },
      latin_bossa: { accuracy: 0, streak: 0, bpm: 90, score: 0 },
      funk_master: { accuracy: 0, streak: 0, bpm: 95, score: 0 },
      shuffle: { accuracy: 0, streak: 0, bpm: 75, score: 0 },
      random_groove: { accuracy: 0, streak: 0, bpm: 85, score: 0 }
    };

    if (typeof localStorage !== 'undefined' && student?.id) {
      LEVEL_TABS.forEach(t => {
        const saved = localStorage.getItem(`cg_rhythm_pr_${student.id}_${t.id}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed.accuracy === 'number') initial[t.id] = parsed;
          } catch (_) {}
        }
      });
    }
    return initial;
  });

  // Check if latest score is a new PR & trigger reload
  useEffect(() => {
    if (!latestScore || !student?.id) return;
    const { level, accuracy, streak, bpm, score } = latestScore;
    const current = personalScores[level];

    const currentScore = current?.score || current?.accuracy || 0;
    const newScore = score || accuracy;

    if (!current || newScore > currentScore || (newScore === currentScore && accuracy > current.accuracy)) {
      const updated = { accuracy, streak, bpm, score: newScore };
      setPersonalScores(prev => ({ ...prev, [level]: updated }));
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`cg_rhythm_pr_${student.id}_${level}`, JSON.stringify(updated));
      }
      setTimeout(() => loadLeaderboardData(), 200);
    }
  }, [latestScore, student?.id, loadLeaderboardData, personalScores]);

  const currentLevelPr = personalScores[selectedLevel];

  // 🏆 Self-Inclusion Engine: Nahtlose Zusammenführung von Server-Einträgen & eigenem Rekord
  const effectiveEntries = useMemo<LeaderboardEntry[]>(() => {
    const list: LeaderboardEntry[] = [...dbEntries];
    const userAlreadyInDb = list.some(e => e.isCurrentUser);

    const userBestScore = currentLevelPr?.score || currentLevelPr?.accuracy || 0;

    // Falls der Schüler noch nicht im DB-Ergebnis ist (weil z. B. Ghost-Modus is_public = false),
    // aber lokal eine Leistung erbracht hat, binden wir ihn nahtlos mit ein
    if (!userAlreadyInDb && student?.id && userBestScore > 0) {
      const matchesFilter = filterMode === 'school' || !studentInstrument || 
        studentInstrument.toLowerCase() === (student?.instrument || '').toLowerCase();

      if (matchesFilter) {
        list.push({
          id: `self-${student.id}`,
          rank: 0, // wird unten berechnet
          name: studentNickname || 'Du (Privat)',
          instrument: studentInstrument,
          score: currentLevelPr.score || currentLevelPr.accuracy,
          accuracy: currentLevelPr.accuracy,
          maxStreak: currentLevelPr.streak,
          bpm: currentLevelPr.bpm,
          isCurrentUser: true,
          isGhost: !isPublic
        });
      }
    }

    // Sortierung nach autoritativem Goldstandard:
    // 1. Score DESC -> 2. Accuracy DESC -> 3. BPM DESC
    list.sort((a, b) => {
      const scoreA = a.score || a.accuracy || 0;
      const scoreB = b.score || b.accuracy || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      return (b.bpm || 0) - (a.bpm || 0);
    });

    // Ränge neu nummerieren (1 bis 10)
    return list.slice(0, 10).map((entry, idx) => ({
      ...entry,
      rank: idx + 1
    }));
  }, [dbEntries, currentLevelPr, student?.id, student?.instrument, studentNickname, studentInstrument, filterMode, isPublic]);

  // Compute student position in effective leaderboard
  const userEntryIndex = effectiveEntries.findIndex(e => e.isCurrentUser);
  const myRank: number | null = userEntryIndex !== -1 ? userEntryIndex + 1 : null;

  // Umschalten Ghost-Modus <-> Öffentliche Teilnahme
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
      } catch (e) {
        console.warn('Backend update note:', e);
      }
    } else {
      setIsPublic(false);
      if (typeof localStorage !== 'undefined' && student?.id) {
        localStorage.setItem(`cg_student_ranking_public_${student.id}`, 'false');
      }
      try {
        await supabase.rpc('set_student_ranking_nickname', {
          p_nickname: studentNickname || 'GhostMusician',
          p_is_public: false
        });
        loadLeaderboardData();
      } catch (e) {
        console.warn('Backend update note:', e);
      }
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

  const activeLevelConfig = LEVEL_TABS.find(t => t.id === selectedLevel) || LEVEL_TABS[0];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      overflow: 'hidden'
    }}>
      {/* Optionaler Einzel-Header (nur falls Standalone außerhalb Modal) */}
      {showHeader && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '12px',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: '#ea580c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Trophy size={18} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 950, color: '#0f172a' }}>
                  Hall of Groove
                </h3>
                <span style={{
                  background: '#fef3c7',
                  color: '#b45309',
                  fontSize: '0.66rem',
                  fontWeight: 900,
                  padding: '2px 7px',
                  borderRadius: '100px'
                }}>
                  Live
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                {schoolName} • Rhythmus-Rangliste
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 1. Kategorie Tabs: 8 Didaktische Rhythmus-Welten (Kompaktes 4x2 Raster) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '4px',
        background: '#f8fafc',
        padding: '4px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0'
      }}>
        {LEVEL_TABS.map(tab => {
          const isSel = selectedLevel === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectLevel(tab.id)}
              style={{
                border: 'none',
                background: isSel ? '#ffffff' : 'transparent',
                color: isSel ? '#0f172a' : '#64748b',
                borderRadius: '10px',
                padding: '7px 4px',
                fontSize: '0.72rem',
                fontWeight: isSel ? 950 : 700,
                cursor: 'pointer',
                boxShadow: isSel ? '0 1px 4px rgba(0, 0, 0, 0.08)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                transition: 'all 0.12s ease'
              }}
              className="hover-scale-mini"
            >
              <TabIcon size={14} color={isSel ? '#ea580c' : '#94a3b8'} strokeWidth={2.4} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Segmented Toggle: Gesamte Musikschule vs. Mein Instrument */}
      <div style={{
        display: 'flex',
        background: '#f1f5f9',
        borderRadius: '12px',
        padding: '3px',
        gap: '3px'
      }}>
        <button
          type="button"
          onClick={() => setFilterMode('school')}
          style={{
            flex: 1,
            border: 'none',
            borderRadius: '9px',
            padding: '7px 10px',
            fontSize: '0.74rem',
            fontWeight: filterMode === 'school' ? 950 : 700,
            background: filterMode === 'school' ? '#ffffff' : 'transparent',
            color: filterMode === 'school' ? '#0f172a' : '#64748b',
            boxShadow: filterMode === 'school' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.12s ease'
          }}
        >
          <School size={14} color={filterMode === 'school' ? '#ea580c' : '#64748b'} strokeWidth={2.4} />
          <span>Gesamte Schule</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode('instrument')}
          style={{
            flex: 1,
            border: 'none',
            borderRadius: '9px',
            padding: '7px 10px',
            fontSize: '0.74rem',
            fontWeight: filterMode === 'instrument' ? 950 : 700,
            background: filterMode === 'instrument' ? '#ffffff' : 'transparent',
            color: filterMode === 'instrument' ? '#0f172a' : '#64748b',
            boxShadow: filterMode === 'instrument' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.12s ease'
          }}
        >
          <Guitar size={14} color={filterMode === 'instrument' ? '#15803d' : '#64748b'} strokeWidth={2.4} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Mein Instrument ({studentInstrument})
          </span>
        </button>
      </div>

      {/* 3. Rangliste / Podest Showcase (0,1% Swiss Design) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minHeight: '200px',
        justifyContent: 'flex-start'
      }}>
        {effectiveEntries.length === 0 ? (
          /* 🌟 Hero Challenger State statt 5x leere Platzhalter */
          <div style={{
            background: '#fffdfa',
            border: '1.5px dashed #fed7aa',
            borderRadius: '18px',
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              background: '#fff7ed',
              border: '1px solid #ffedd5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ea580c'
            }}>
              <Crown size={24} strokeWidth={2.2} />
            </div>

            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '0.96rem', fontWeight: 950, color: '#0f172a' }}>
                Noch kein Eintrag in „{activeLevelConfig.label}“
              </h4>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', fontWeight: 650, maxWidth: '360px', lineHeight: 1.4 }}>
                Sei der erste Rhythmus-Champion deiner Musikschule! Spiele jetzt eine Runde und sichere dir Platz 1 auf dem Siegerpodest.
              </p>
            </div>

            {onPlayLevel && (
              <button
                type="button"
                onClick={() => onPlayLevel(selectedLevel)}
                style={{
                  marginTop: '4px',
                  background: '#ea580c',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 18px',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 3px 10px rgba(234, 88, 12, 0.25)',
                  minHeight: '44px'
                }}
                className="hover-scale-mini"
              >
                <Play size={14} fill="#ffffff" color="#ffffff" />
                <span>Groove starten & Platz 1 sichern</span>
              </button>
            )}
          </div>
        ) : (
          /* 🥇🥈🥉 Echtes Podest mit Top-3-Karten & schlanker Liste */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {effectiveEntries.map(entry => {
              const isGold = entry.rank === 1;
              const isSilver = entry.rank === 2;
              const isBronze = entry.rank === 3;

              // Hintergrund & Rahmen nach 0,1% Swiss Design (Solid Uni-Colors)
              let cardBg = '#ffffff';
              let cardBorder = '1px solid #f1f5f9';
              let badgeBg = '#f1f5f9';
              let badgeColor = '#64748b';

              if (isGold) {
                cardBg = '#fffdf5';
                cardBorder = '1.5px solid #fde68a';
                badgeBg = '#f59e0b';
                badgeColor = '#ffffff';
              } else if (isSilver) {
                cardBg = '#f8fafc';
                cardBorder = '1px solid #e2e8f0';
                badgeBg = '#94a3b8';
                badgeColor = '#ffffff';
              } else if (isBronze) {
                cardBg = '#fffaf5';
                cardBorder = '1px solid #fed7aa';
                badgeBg = '#d97706';
                badgeColor = '#ffffff';
              }

              if (entry.isCurrentUser) {
                cardBorder = isGold ? '2px solid #f59e0b' : '1.5px solid #22c55e';
              }

              return (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: isGold ? '10px 14px' : '8px 12px',
                    borderRadius: '14px',
                    background: cardBg,
                    border: cardBorder,
                    boxShadow: isGold ? '0 2px 8px rgba(245, 158, 11, 0.10)' : 'none',
                    transition: 'all 0.12s ease'
                  }}
                >
                  {/* Rank & Musiker */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      width: isGold ? '30px' : '26px',
                      height: isGold ? '30px' : '26px',
                      borderRadius: '9px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: isGold ? '0.86rem' : '0.78rem',
                      fontWeight: 950,
                      background: badgeBg,
                      color: badgeColor
                    }}>
                      {isGold ? <Crown size={14} strokeWidth={2.4} /> : entry.rank}
                    </span>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: isGold ? '0.88rem' : '0.82rem',
                          fontWeight: 950,
                          color: '#0f172a'
                        }}>
                          {entry.name}
                        </span>

                        {entry.isCurrentUser && (
                          <span style={{
                            background: '#dcfce7',
                            color: '#15803d',
                            fontSize: '0.62rem',
                            fontWeight: 900,
                            padding: '1px 6px',
                            borderRadius: '6px'
                          }}>
                            Du
                          </span>
                        )}

                        {entry.isGhost && (
                          <span style={{
                            background: '#f1f5f9',
                            color: '#64748b',
                            fontSize: '0.60rem',
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            <Lock size={9} />
                            <span>Privat</span>
                          </span>
                        )}
                      </div>

                      <span style={{ fontSize: '0.68rem', fontWeight: 650, color: '#64748b' }}>
                        {entry.instrument} • {entry.bpm} BPM
                      </span>
                    </div>
                  </div>

                  {/* Score & Streak */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {entry.maxStreak > 0 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '0.70rem',
                        fontWeight: 850,
                        color: '#b45309',
                        background: '#fef3c7',
                        padding: '2px 7px',
                        borderRadius: '6px'
                      }} title="Beste Streak">
                        <Flame size={11} color="#d97706" />
                        <span>{entry.maxStreak}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{
                        fontSize: isGold ? '1.02rem' : '0.90rem',
                        fontWeight: 950,
                        color: isGold ? '#b45309' : '#15803d',
                        minWidth: '50px',
                        textAlign: 'right',
                        lineHeight: 1.1
                      }}>
                        {entry.score ? `${entry.score} Pkt` : `${entry.accuracy}%`}
                      </span>
                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        color: '#64748b'
                      }}>
                        {entry.accuracy}% Treffer
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Deine Bestleistung (Sticky My-Record Box) - 100% Swiss Uni-Colors */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {/* Status Zeile */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Target size={15} color="#ea580c" strokeWidth={2.6} />
            <span style={{ 
              fontSize: '0.72rem', 
              fontWeight: 950, 
              color: '#334155', 
              textTransform: 'uppercase', 
              letterSpacing: '0.04em' 
            }}>
              Deine Bestleistung ({activeLevelConfig.label})
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              background: isPublic ? '#dcfce7' : '#f1f5f9',
              border: isPublic ? '1px solid #bbf7d0' : '1px solid #cbd5e1',
              color: isPublic ? '#15803d' : '#64748b',
              fontSize: '0.68rem',
              fontWeight: 900,
              padding: '2px 8px',
              borderRadius: '100px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {isPublic ? (
                <>
                  <Eye size={10} color="#15803d" />
                  <span>{myRank !== null ? `Platz ${myRank}` : 'In Rangliste'}</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={10} color="#64748b" />
                  <span>Privat (Ghost)</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Nickname & Score Details */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 950, color: '#0f172a' }}>
                {studentNickname || 'Musiker'}
              </span>
              <button
                type="button"
                onClick={() => setIsNicknameModalOpen(true)}
                title="Musiker-Nickname ändern"
                aria-label="Musiker-Nickname ändern"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#64748b'
                }}
              >
                <Pencil size={12} />
              </button>
            </div>
            <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 700 }}>
              Streak: {currentLevelPr?.streak || 0} • {currentLevelPr?.bpm || 85} BPM ({studentInstrument})
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '1.20rem', fontWeight: 950, color: '#0f172a', lineHeight: 1.1 }}>
              {currentLevelPr?.score ? `${currentLevelPr.score} Pkt` : `${currentLevelPr?.accuracy || 0}%`}
            </span>
            {Boolean(currentLevelPr?.score) && (
              <span style={{ fontSize: '0.66rem', fontWeight: 750, color: '#15803d' }}>
                {currentLevelPr?.accuracy}% Treffer
              </span>
            )}
          </div>
        </div>

        {/* 1-Klick Privacy / Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
          <button
            type="button"
            onClick={handleTogglePublic}
            style={{
              flex: 1,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '8px 10px',
              color: '#334155',
              fontSize: '0.72rem',
              fontWeight: 850,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.12s ease',
              minHeight: '40px'
            }}
            className="hover-scale-mini"
          >
            {isPublic ? (
              <>
                <EyeOff size={13} color="#64748b" />
                <span>Auf Privat maskieren</span>
              </>
            ) : (
              <>
                <Eye size={13} color="#ea580c" />
                <span style={{ color: '#ea580c', fontWeight: 950 }}>Öffentlich anzeigen 🚀</span>
              </>
            )}
          </button>

          {onPlayLevel && (
            <button
              type="button"
              onClick={() => onPlayLevel(selectedLevel)}
              style={{
                flex: 1,
                background: '#ea580c',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 10px',
                color: '#ffffff',
                fontSize: '0.74rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(234, 88, 12, 0.20)',
                minHeight: '40px'
              }}
              className="hover-scale-mini"
            >
              <Play size={13} fill="#ffffff" color="#ffffff" />
              <span>Rekord angreifen</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. Nickname Setup Modal */}
      <StudentNicknameSetupModal
        isOpen={isNicknameModalOpen}
        onClose={() => setIsNicknameModalOpen(false)}
        currentNickname={studentNickname}
        isPublic={true}
        studentFirstName={student?.first_name}
        studentLastName={student?.last_name}
        studentId={student?.id}
        teacherNames={teacherNames}
        onSaveSuccess={handleSaveNicknameSuccess}
      />
    </div>
  );
};
