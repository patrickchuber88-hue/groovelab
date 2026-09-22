import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Flame, 
  Sparkles, 
  Target, 
  Play, 
  Layers, 
  Activity, 
  CircleDot,
  Eye,
  EyeOff,
  Pencil,
  Filter,
  ShieldCheck,
  Music,
  Zap,
  Shuffle,
  Dices,
  Sun,
  School,
  Guitar
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
}

const LEVEL_TABS: { id: RhythmLevel; label: string; icon: any; color: string }[] = [
  { id: 'viertel', label: '1. Viertel', icon: CircleDot, color: '#f59e0b' },
  { id: 'rock_mix', label: '2. Rock', icon: Music, color: '#10b981' },
  { id: 'synkopen', label: '3. Off-Beat', icon: Activity, color: '#6366f1' },
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
  useNotebookLayout = false
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
  const loadLeaderboardData = async () => {
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
  };

  useEffect(() => {
    loadLeaderboardData();
  }, [filterMode, selectedLevel, student?.school_id, studentInstrument]);

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
      setTimeout(() => loadLeaderboardData(), 300);
    }
  }, [latestScore, student?.id]);

  const currentLevelPr = personalScores[selectedLevel];

  // Echte Einträge aus der Datenbank
  const entries: LeaderboardEntry[] = dbEntries;

  // Compute student position
  let myRank: number | null = null;
  const userEntryIndex = entries.findIndex(e => e.isCurrentUser);
  if (userEntryIndex !== -1) {
    myRank = userEntryIndex + 1;
  }

  // Umschalten Ghost-Modus <-> Öffentliche Teilnahme
  const handleTogglePublic = async () => {
    if (!isPublic) {
      // Möchte öffentlich teilnehmen: Falls noch kein Nickname gewählt -> Modal öffnen
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
      } catch (e) {
        console.warn('Backend update note:', e);
      }
    } else {
      // Zurück in den Ghost-Modus (Privat)
      setIsPublic(false);
      if (typeof localStorage !== 'undefined' && student?.id) {
        localStorage.setItem(`cg_student_ranking_public_${student.id}`, 'false');
      }
      try {
        await supabase.rpc('set_student_ranking_nickname', {
          p_nickname: studentNickname || 'GhostMusician',
          p_is_public: false
        });
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
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      minHeight: '0',
      maxHeight: '100%',
      background: '#ffffff',
      borderRadius: useNotebookLayout ? '24px' : '20px',
      border: '1.5px solid #fed7aa',
      boxShadow: useNotebookLayout
        ? '0 12px 36px -8px rgba(217, 119, 6, 0.10), 0 2px 8px rgba(0, 0, 0, 0.03)'
        : '0 10px 30px -6px rgba(0, 0, 0, 0.05)',
      padding: useNotebookLayout ? '14px 18px' : '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxSizing: 'border-box',
      gap: '10px',
      overflow: 'hidden'
    }}>
      {/* 1. Header: Titel & Schul-Badge */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(217, 119, 6, 0.30)'
            }}>
              <Trophy size={22} color="#ffffff" strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.01em' }}>
                  Hall of Groove
                </h3>
                <span style={{
                  background: '#fef3c7',
                  color: '#b45309',
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  padding: '2px 8px',
                  borderRadius: '100px'
                }}>
                  Live
                </span>
              </div>
              <p style={{ margin: '1px 0 0 0', fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>
                {schoolName} • Rhythmus-Rangliste
              </p>
            </div>
          </div>

          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '4px 10px',
            fontSize: '0.72rem',
            fontWeight: 850,
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <Sparkles size={13} color="#f59e0b" />
            <span>Top 5</span>
          </div>
        </div>

        {/* 2. Kategorie Tabs: 8 Didaktische Rhythmus-Welten (4x2 Raster) */}
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
                  padding: '6px 2px',
                  fontSize: '0.70rem',
                  fontWeight: isSel ? 950 : 750,
                  cursor: 'pointer',
                  boxShadow: isSel ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  transition: 'all 0.12s ease'
                }}
                className="hover-scale-mini"
              >
                <TabIcon size={14} color={isSel ? tab.color : '#94a3b8'} strokeWidth={2.4} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* 2b. 🏛️ Segmented Toggle: Gesamte Musikschule vs. Mein Instrument */}
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
              padding: '6px 8px',
              fontSize: '0.74rem',
              fontWeight: filterMode === 'school' ? 950 : 750,
              background: filterMode === 'school' ? '#ffffff' : 'transparent',
              color: filterMode === 'school' ? '#0f172a' : '#64748b',
              boxShadow: filterMode === 'school' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.12s ease'
            }}
          >
            <School size={14} color={filterMode === 'school' ? '#d97706' : '#64748b'} strokeWidth={2.4} />
            <span>Gesamte Schule</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('instrument')}
            style={{
              flex: 1,
              border: 'none',
              borderRadius: '9px',
              padding: '6px 8px',
              fontSize: '0.74rem',
              fontWeight: filterMode === 'instrument' ? 950 : 750,
              background: filterMode === 'instrument' ? '#ffffff' : 'transparent',
              color: filterMode === 'instrument' ? '#0f172a' : '#64748b',
              boxShadow: filterMode === 'instrument' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.12s ease'
            }}
          >
            <Guitar size={14} color={filterMode === 'instrument' ? '#16a34a' : '#64748b'} strokeWidth={2.4} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Mein Instrument ({studentInstrument})
            </span>
          </button>
        </div>
      </div>

      {/* 3. Rangliste: Zero-Dummy Architecture (Echte User + motivierende freie Plätze) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        flex: 1,
        justifyContent: 'flex-start'
      }}>
        {/* Top 5 Slots rendering: echte Einträge + unbesetzte Plätze */}
        {[1, 2, 3, 4, 5].map((slotRank) => {
          const entry = entries.find(e => e.rank === slotRank);
          const isGold = slotRank === 1;
          const isSilver = slotRank === 2;
          const isBronze = slotRank === 3;

          if (entry) {
            return (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '14px',
                  background: isGold 
                    ? 'linear-gradient(90deg, #fffbeb 0%, #fef3c7 100%)' 
                    : (isSilver ? '#f8fafc' : (isBronze ? '#fff7ed' : '#ffffff')),
                  border: isGold 
                    ? '1.5px solid #fde68a' 
                    : (isSilver ? '1px solid #e2e8f0' : (isBronze ? '1px solid #ffedd5' : '1px solid #f1f5f9')),
                  boxShadow: isGold ? '0 2px 8px rgba(245, 158, 11, 0.12)' : 'none',
                  transition: 'all 0.10s ease'
                }}
              >
                {/* Rank & Musiker-Nickname */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.80rem',
                    fontWeight: 950,
                    background: isGold ? '#f59e0b' : (isSilver ? '#94a3b8' : (isBronze ? '#d97706' : '#f1f5f9')),
                    color: isGold || isSilver || isBronze ? '#ffffff' : '#64748b'
                  }}>
                    {entry.rank}
                  </span>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#0f172a' }}>
                        {entry.name}
                      </span>
                      {entry.isCurrentUser && (
                        <span style={{
                          background: '#dcfce7',
                          color: '#15803d',
                          fontSize: '0.62rem',
                          fontWeight: 900,
                          padding: '1px 5px',
                          borderRadius: '6px'
                        }}>
                          Du
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b' }}>
                      {entry.instrument} • {entry.bpm} BPM
                    </span>
                  </div>
                </div>

                {/* Score, Accuracy & Streak */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{
                      fontSize: '0.92rem',
                      fontWeight: 950,
                      color: '#15803d',
                      minWidth: '50px',
                      textAlign: 'right',
                      lineHeight: 1.1
                    }}>
                      {entry.score ? `${entry.score} Pkt` : `${entry.accuracy}%`}
                    </span>
                    <span style={{
                      fontSize: '0.66rem',
                      fontWeight: 750,
                      color: '#64748b'
                    }}>
                      {entry.accuracy}% • {entry.bpm} BPM
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          // Unbesetzter Platz (Zero Dummy Architecture)
          return (
            <div
              key={`empty-${slotRank}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '14px',
                background: '#fafafa',
                border: '1px dashed #e2e8f0'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.80rem',
                  fontWeight: 900,
                  background: '#f1f5f9',
                  color: '#94a3b8'
                }}>
                  {slotRank}
                </span>

                <span style={{ fontSize: '0.78rem', fontWeight: 750, color: '#94a3b8', fontStyle: 'italic' }}>
                  Noch unbesetzt • Hol dir Platz {slotRank}!
                </span>
              </div>

              {onPlayLevel && (
                <button
                  type="button"
                  onClick={() => onPlayLevel(selectedLevel)}
                  style={{
                    border: 'none',
                    background: '#fef3c7',
                    color: '#b45309',
                    fontSize: '0.70rem',
                    fontWeight: 900,
                    padding: '3px 8px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  className="hover-scale-mini"
                >
                  <Play size={10} fill="#b45309" />
                  <span>Jetzt spielen</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. Deine Bestleistung (Sticky My-Record Box) mit Ghost-Mode & Nickname-Steuerung */}
      <div style={{
        background: isPublic 
          ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' 
          : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        border: isPublic ? '1.5px solid #86efac' : '1.5px solid #cbd5e1',
        borderRadius: '18px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxShadow: isPublic 
          ? '0 4px 14px rgba(22, 101, 52, 0.08)' 
          : '0 4px 12px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Status Zeile */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Target size={15} color={isPublic ? '#15803d' : '#475569'} strokeWidth={2.6} />
            <span style={{ 
              fontSize: '0.76rem', 
              fontWeight: 950, 
              color: isPublic ? '#166534' : '#334155', 
              textTransform: 'uppercase', 
              letterSpacing: '0.02em' 
            }}>
              Deine Bestleistung
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Ghost-Mode / Public Badge */}
            <span style={{
              background: isPublic ? '#ffffff' : '#e2e8f0',
              border: isPublic ? '1px solid #bbf7d0' : '1px solid #cbd5e1',
              color: isPublic ? '#15803d' : '#475569',
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
                  <span>{myRank !== null ? `Platz ${myRank} (${filterMode === 'school' ? 'Schule' : studentInstrument})` : 'Noch nicht in den Top 10'}</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={10} color="#64748b" />
                  <span>Privat (Ghost-Modus)</span>
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
                {isPublic && studentNickname ? studentNickname : 'Dein Profil (Privat)'}
              </span>
              {studentNickname && (
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
              )}
            </div>
            <span style={{ fontSize: '0.70rem', color: isPublic ? '#166534' : '#64748b', fontWeight: 750 }}>
              Streak: {currentLevelPr?.streak || 0} • {currentLevelPr?.bpm || 85} BPM ({studentInstrument})
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '1.24rem', fontWeight: 950, color: isPublic ? '#15803d' : '#334155', lineHeight: 1.1 }}>
              {currentLevelPr?.score ? `${currentLevelPr.score} Pkt` : `${currentLevelPr?.accuracy || 0}%`}
            </span>
            {Boolean(currentLevelPr?.score) && (
              <span style={{ fontSize: '0.66rem', fontWeight: 750, color: isPublic ? '#166534' : '#64748b' }}>
                {currentLevelPr?.accuracy}% Treffer
              </span>
            )}
          </div>
        </div>

        {/* 1-Klick Privacy / Leaderboard Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
          <button
            type="button"
            onClick={handleTogglePublic}
            style={{
              flex: 1,
              background: isPublic ? '#f1f5f9' : '#0284c7',
              border: isPublic ? '1px solid #cbd5e1' : 'none',
              borderRadius: '10px',
              padding: '6px 10px',
              color: isPublic ? '#475569' : '#ffffff',
              fontSize: '0.72rem',
              fontWeight: 850,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              transition: 'all 0.12s ease'
            }}
          >
            {isPublic ? (
              <>
                <EyeOff size={12} />
                <span>Auf Privat schalten (Ghost-Modus)</span>
              </>
            ) : (
              <>
                <Eye size={12} color="#ffffff" />
                <span>In Hall of Groove eintragen</span>
              </>
            )}
          </button>

          {onPlayLevel && (
            <button
              type="button"
              onClick={() => onPlayLevel(selectedLevel)}
              style={{
                flex: 1,
                background: '#15803d',
                border: 'none',
                borderRadius: '10px',
                padding: '6px 10px',
                color: '#ffffff',
                fontSize: '0.72rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                boxShadow: '0 2px 6px rgba(21, 128, 61, 0.20)'
              }}
              className="hover-scale-mini"
            >
              <Play size={12} fill="#ffffff" color="#ffffff" />
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
