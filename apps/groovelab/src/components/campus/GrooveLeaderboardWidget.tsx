import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Medal, 
  Flame, 
  Sparkles, 
  Target, 
  Play, 
  Star, 
  Award, 
  Layers, 
  Activity, 
  CircleDot,
  RotateCcw
} from 'lucide-react';

export type RhythmLevel = 'viertel' | 'achtel' | 'synkopen' | 'shuffle';

export interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  instrument: string;
  avatarUrl?: string;
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
    accuracy: number;
    streak: number;
    bpm: number;
  } | null;
  useNotebookLayout?: boolean;
}

const DEFAULT_SEEDS: Record<RhythmLevel, LeaderboardEntry[]> = {
  viertel: [
    { id: '1', rank: 1, name: 'Maya S.', instrument: 'Gitarre', accuracy: 99, maxStreak: 36, bpm: 85 },
    { id: '2', rank: 2, name: 'Felix B.', instrument: 'Drums', accuracy: 97, maxStreak: 32, bpm: 90 },
    { id: '3', rank: 3, name: 'Sophia K.', instrument: 'Klavier', accuracy: 95, maxStreak: 26, bpm: 80 },
    { id: '4', rank: 4, name: 'Noah T.', instrument: 'E-Bass', accuracy: 92, maxStreak: 20, bpm: 80 },
    { id: '5', rank: 5, name: 'Lukas W.', instrument: 'Saxophon', accuracy: 90, maxStreak: 18, bpm: 80 }
  ],
  achtel: [
    { id: '1', rank: 1, name: 'Felix B.', instrument: 'Drums', accuracy: 98, maxStreak: 48, bpm: 95 },
    { id: '2', rank: 2, name: 'Maya S.', instrument: 'Gitarre', accuracy: 96, maxStreak: 40, bpm: 90 },
    { id: '3', rank: 3, name: 'Emilia R.', instrument: 'Querflöte', accuracy: 93, maxStreak: 30, bpm: 90 },
    { id: '4', rank: 4, name: 'Jonas M.', instrument: 'Klavier', accuracy: 89, maxStreak: 22, bpm: 85 },
    { id: '5', rank: 5, name: 'Leonie H.', instrument: 'Violine', accuracy: 87, maxStreak: 19, bpm: 90 }
  ],
  synkopen: [
    { id: '1', rank: 1, name: 'Noah T.', instrument: 'E-Bass', accuracy: 96, maxStreak: 32, bpm: 95 },
    { id: '2', rank: 2, name: 'Felix B.', instrument: 'Drums', accuracy: 94, maxStreak: 28, bpm: 95 },
    { id: '3', rank: 3, name: 'Maya S.', instrument: 'Gitarre', accuracy: 91, maxStreak: 24, bpm: 95 },
    { id: '4', rank: 4, name: 'David P.', instrument: 'Trompete', accuracy: 88, maxStreak: 18, bpm: 90 },
    { id: '5', rank: 5, name: 'Sophia K.', instrument: 'Klavier', accuracy: 85, maxStreak: 15, bpm: 95 }
  ],
  shuffle: [
    { id: '1', rank: 1, name: 'Felix B.', instrument: 'Drums', accuracy: 97, maxStreak: 42, bpm: 80 },
    { id: '2', rank: 2, name: 'Noah T.', instrument: 'E-Bass', accuracy: 93, maxStreak: 36, bpm: 75 },
    { id: '3', rank: 3, name: 'Maya S.', instrument: 'Gitarre', accuracy: 90, maxStreak: 28, bpm: 75 },
    { id: '4', rank: 4, name: 'Lukas W.', instrument: 'Saxophon', accuracy: 86, maxStreak: 22, bpm: 75 },
    { id: '5', rank: 5, name: 'Anna Z.', instrument: 'Gesang', accuracy: 84, maxStreak: 18, bpm: 70 }
  ]
};

const LEVEL_TABS: { id: RhythmLevel; label: string; icon: any; color: string }[] = [
  { id: 'viertel', label: 'Viertel', icon: CircleDot, color: '#f59e0b' },
  { id: 'achtel', label: 'Achtel', icon: Layers, color: '#10b981' },
  { id: 'synkopen', label: 'Off-Beat', icon: Activity, color: '#6366f1' },
  { id: 'shuffle', label: 'Shuffle', icon: Flame, color: '#ec4899' }
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
  const studentName = student?.first_name ? `${student.first_name}${student.last_name ? ` ${student.last_name[0]}.` : ''}` : 'Du';
  const studentInstrument = student?.instrument || 'Schüler';

  // Load and merge student personal highscore per level
  const [personalScores, setPersonalScores] = useState<Record<RhythmLevel, { accuracy: number; streak: number; bpm: number }>>(() => {
    const initial: Record<RhythmLevel, { accuracy: number; streak: number; bpm: number }> = {
      viertel: { accuracy: 88, streak: 16, bpm: 80 },
      achtel: { accuracy: 84, streak: 14, bpm: 90 },
      synkopen: { accuracy: 78, streak: 10, bpm: 95 },
      shuffle: { accuracy: 72, streak: 8, bpm: 75 }
    };

    if (typeof localStorage !== 'undefined' && student?.id) {
      LEVEL_TABS.forEach(t => {
        const saved = localStorage.getItem(`cg_rhythm_pr_${student.id}_${t.id}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.accuracy) initial[t.id] = parsed;
          } catch (_) {}
        }
      });
    }
    return initial;
  });

  // Check if latest score is a new PR
  useEffect(() => {
    if (!latestScore || !student?.id) return;
    const { level, accuracy, streak, bpm } = latestScore;
    const current = personalScores[level];

    if (!current || accuracy > current.accuracy || (accuracy === current.accuracy && streak > current.streak)) {
      const updated = { accuracy, streak, bpm };
      setPersonalScores(prev => ({ ...prev, [level]: updated }));
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`cg_rhythm_pr_${student.id}_${level}`, JSON.stringify(updated));
      }
    }
  }, [latestScore, personalScores, student?.id]);

  const currentLevelPr = personalScores[selectedLevel];
  const entries = DEFAULT_SEEDS[selectedLevel] || DEFAULT_SEEDS.viertel;

  // Compute student position
  let myRank = 6;
  if (currentLevelPr) {
    if (currentLevelPr.accuracy >= entries[0].accuracy) myRank = 1;
    else if (currentLevelPr.accuracy >= entries[1].accuracy) myRank = 2;
    else if (currentLevelPr.accuracy >= entries[2].accuracy) myRank = 3;
    else if (currentLevelPr.accuracy >= entries[3].accuracy) myRank = 4;
    else if (currentLevelPr.accuracy >= entries[4].accuracy) myRank = 5;
    else myRank = 6;
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      minHeight: '520px',
      background: '#ffffff',
      borderRadius: useNotebookLayout ? '28px' : '24px',
      border: '1.5px solid #fed7aa',
      boxShadow: useNotebookLayout
        ? '0 12px 36px -8px rgba(217, 119, 6, 0.10), 0 2px 8px rgba(0, 0, 0, 0.03)'
        : '0 10px 30px -6px rgba(0, 0, 0, 0.05)',
      padding: useNotebookLayout ? '22px 24px' : '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxSizing: 'border-box',
      gap: '14px'
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

        {/* 2. Kategorie Tabs: 4 Rhythmen */}
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
                  padding: '6px 4px',
                  fontSize: '0.72rem',
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
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Rangliste: Die Top 5 Schüler */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        flex: 1,
        justifyContent: 'flex-start'
      }}>
        {entries.map((entry) => {
          const isGold = entry.rank === 1;
          const isSilver = entry.rank === 2;
          const isBronze = entry.rank === 3;

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
              {/* Rank & Name */}
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
                  <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#0f172a' }}>
                    {entry.name}
                  </span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b' }}>
                    {entry.instrument} • {entry.bpm} BPM
                  </span>
                </div>
              </div>

              {/* Accuracy & Streak */}
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
                }}>
                  <Flame size={11} color="#d97706" />
                  <span>{entry.maxStreak}</span>
                </div>

                <span style={{
                  fontSize: '0.90rem',
                  fontWeight: 950,
                  color: '#15803d',
                  minWidth: '46px',
                  textAlign: 'right'
                }}>
                  {entry.accuracy}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Deine Bestleistung (Sticky My-Record Box) */}
      <div style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
        border: '1.5px solid #86efac',
        borderRadius: '18px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxShadow: '0 4px 14px rgba(22, 101, 52, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Target size={15} color="#15803d" strokeWidth={2.6} />
            <span style={{ fontSize: '0.76rem', fontWeight: 950, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              Deine Bestleistung
            </span>
          </div>
          <span style={{
            background: '#ffffff',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            fontSize: '0.70rem',
            fontWeight: 900,
            padding: '2px 8px',
            borderRadius: '100px'
          }}>
            Platz {myRank} in der Schule
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 950, color: '#0f172a' }}>
              {studentName} ({studentInstrument})
            </span>
            <span style={{ fontSize: '0.70rem', color: '#166534', fontWeight: 750 }}>
              Streak: {currentLevelPr?.streak || 0} • {currentLevelPr?.bpm || 85} BPM
            </span>
          </div>

          <span style={{ fontSize: '1.18rem', fontWeight: 950, color: '#15803d' }}>
            {currentLevelPr?.accuracy || 0}%
          </span>
        </div>

        {onPlayLevel && (
          <button
            type="button"
            onClick={() => onPlayLevel(selectedLevel)}
            style={{
              width: '100%',
              background: '#15803d',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 12px',
              color: '#ffffff',
              fontSize: '0.78rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(21, 128, 61, 0.25)',
              marginTop: '2px'
            }}
            className="hover-scale-mini"
          >
            <Play size={13} fill="#ffffff" color="#ffffff" />
            <span>Eigenen Rekord angreifen</span>
          </button>
        )}
      </div>
    </div>
  );
};
