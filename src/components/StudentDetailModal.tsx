import React, { useState, useEffect } from 'react';
import { X, Calendar, Music, Award, Star, Clock, User, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { 
  ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts';

import { renderInstrumentIcon } from '../utils/instruments';

const brandColor = 'var(--primary-color)';

interface StudentDetailModalProps {
  student: any;
  onClose: () => void;
  onOpenBandProfile?: (band: any) => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ student, onClose, onOpenBandProfile }) => {
  const [skills, setSkills] = useState<any[]>([]);
  const [bands, setBands] = useState<any[]>([]);
  const [vocalsSongIds, setVocalsSongIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showFullPhoto, setShowFullPhoto] = useState(false);
  const [sessionsList, setSessionsList] = useState<any[]>([]);
  const [planningList, setPlanningList] = useState<any[]>([]);

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
              songs (*)
            )
          )
        `)
        .eq('user_id', student.id);
      
      const uniqueBandsList: any[] = [];
      const seenBandIds = new Set();
      (bandsData || []).forEach((m: any) => {
        const b = Array.isArray(m.bands) ? m.bands[0] : m.bands;
        if (b && !seenBandIds.has(b.id)) {
          seenBandIds.add(b.id);
          uniqueBandsList.push(b);
        }
      });
      setBands(uniqueBandsList);

      // Fetch vocals slots (formation singing)
      const { data: slotsData } = await supabase
        .from('band_song_slots')
        .select('*, band_songs(*)')
        .eq('user_id', student.id);
      
      const vIds = new Set<string>();
      (slotsData || []).forEach((s: any) => {
        const isVocal = (s.instrument || '').toLowerCase().includes('vocal') || (s.instrument || '').toLowerCase().includes('gesang');
        const songId = s.band_songs?.song_id;
        if (isVocal && s.status !== 'declined' && songId) {
          vIds.add(String(songId));
        }
      });
      setVocalsSongIds(vIds);

      // Fetch sessions
      const { data: sessData } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', student.id)
        .order('check_in_time', { ascending: false });
      setSessionsList(sessData || []);

      // Fetch lab_planning slots
      const { data: planData } = await supabase
        .from('lab_planning')
        .select('*')
        .eq('user_id', student.id);
      setPlanningList(planData || []);

      setLoading(false);
    };
    fetchData();
  }, [student.id]);



  const memberSince = new Date(student.created_at).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  const weekSessions = (() => {
    if (loading || !planningList || planningList.length === 0) return [];

    const dayOrder: { [day: string]: number } = { 'Mo': 1, 'Di': 2, 'Mi': 3, 'Do': 4, 'Fr': 5, 'Sa': 6, 'So': 7 };
    const slotsByDay: { [day: string]: string[] } = {};
    
    planningList.forEach(s => {
      if (!slotsByDay[s.day]) slotsByDay[s.day] = [];
      slotsByDay[s.day].push(s.time);
    });

    const presenceList: { dayStr: string; rangeStr: string; sortKey: number }[] = [];

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
          dayStr: day,
          rangeStr: `${r.start} Uhr - ${r.end} Uhr`,
          sortKey: (dayOrder[day] || 99) * 10000 + toMin(r.start)
        });
      });
    });

    presenceList.sort((a, b) => a.sortKey - b.sortKey);
    return presenceList;
  })();


  // Grouping logic for songs
  const groupedSongs = skills.reduce((acc: any, s: any) => {
    const songId = s.song_id;
    const level = s.difficulty_level;
    const key = `${songId}_${level}`;
    if (!acc[key]) {
      acc[key] = {
        id: songId,
        title: s.songs?.title,
        artist: s.songs?.artist,
        level: level,
        instruments: []
      };
    }
    acc[key].instruments.push({
      name: s.instrument,
      part_number: s.part_number || 1,
      progress: s.is_stage_ready ? 100 : (s.progress_percent || 0),
      is_stage_ready: s.is_stage_ready
    });
    return acc;
  }, {});

  const songsArray = Object.values(groupedSongs).map((s: any) => {
    const getBaseInst = (name: string) => {
      const n = (name || '').toLowerCase();
      if (n.includes('gitarre') || n.includes('guitar')) return 'Guitar';
      if (n.includes('drums') || n.includes('schlagzeug')) return 'Drums';
      if (n.includes('piano') || n.includes('keys')) return 'Piano';
      if (n.includes('bass')) return 'Bass';
      return name;
    };
    const orderMap: Record<string, number> = { 'Guitar': 1, 'Drums': 2, 'Piano': 3, 'Bass': 4 };
    const sortedInstruments = [...s.instruments].sort((a, b) => {
      const idxA = orderMap[getBaseInst(a.name)] || 99;
      const idxB = orderMap[getBaseInst(b.name)] || 99;
      if (idxA !== idxB) return idxA - idxB;
      return (a.part_number || 1) - (b.part_number || 1);
    });
    return { ...s, instruments: sortedInstruments };
  });
  const practiceBoard = songsArray.filter((s: any) => s.instruments.some((i: any) => i.progress > 0 && !i.is_stage_ready));
  const repertoire = songsArray.filter((s: any) => s.instruments.some((i: any) => i.is_stage_ready));

  const studentRadarData = (() => {
    const radarBase: Record<string, number> = { Guitar: 0, Bass: 0, Drums: 0, Keys: 0, Vocals: 0 };
    skills.forEach((s: any) => {
      const sInst = s.instrument?.toLowerCase();
      if (!sInst) return;
      
      let target: string | null = null;
      if (sInst === 'guitar' || sInst === 'e-gitarre') target = 'Guitar';
      else if (sInst === 'bass' || sInst === 'e-bass') target = 'Bass';
      else if (sInst === 'drums' || sInst === 'e-drums') target = 'Drums';
      else if (sInst === 'keys' || sInst === 'piano' || sInst === 'e-piano') target = 'Keys';
      else if (sInst === 'vocals' || sInst === 'gesang') target = 'Vocals';
      
      if (target && radarBase[target] !== undefined) {
        const prog = s.progress_percent || 0;
        const xp = (s.is_stage_ready || prog === 100) ? 500 : prog * 2;
        radarBase[target] += xp;
      }
    });
    return Object.entries(radarBase).map(([inst, xp]) => ({ instrument: inst, xp }));
  })();

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass-panel animation-slide-up" style={{ background: 'white', padding: '32px', borderRadius: '32px', maxWidth: '920px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
          <X size={20} />
        </button>

        <div style={{ display: 'flex', gap: '28px', marginBottom: '32px', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-start', flex: '1 1 350px' }}>
            <div 
              onClick={() => setShowFullPhoto(true)}
              style={{ width: '120px', height: '120px', borderRadius: '28px', overflow: 'hidden', boxShadow: '0 10px 28px rgba(0,0,0,0.08)', border: '4px solid white', flexShrink: 0, cursor: 'pointer', transition: 'all 0.2s ease' }}
              className="hover-scale"
            >
              <img src={student.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', margin: 0, lineHeight: 1.1 }}>{student.first_name} {student.last_name}</h2>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                  <Calendar size={14} /> Member seit {memberSince}
                </div>

                <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', padding: '4px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 950, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)' }}>
                  <Star size={12} fill="white" /> {(skills.filter(s => {
                    const isVocal = (s.instrument || '').toLowerCase().includes('vocal') || (s.instrument || '').toLowerCase().includes('gesang');
                    return s.is_stage_ready && !isVocal;
                  }).length + vocalsSongIds.size) * 100} XP
                </div>
              </div>
              
              {/* Instrument Master Counters */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'nowrap' }}>
                {['Guitar', 'Drums', 'Keys', 'Bass', 'Vocals'].map(inst => {
                  let count = 0;
                  if (inst === 'Vocals') {
                    count = vocalsSongIds.size;
                  } else {
                    count = skills.filter(s => {
                      const sInst = s.instrument?.toLowerCase();
                      const target = inst.toLowerCase();
                      let match = false;
                      if (target === 'guitar') match = sInst === 'guitar' || sInst === 'e-gitarre';
                      else if (target === 'bass') match = sInst === 'bass' || sInst === 'e-bass';
                      else if (target === 'drums') match = sInst === 'drums' || sInst === 'e-drums';
                      else if (target === 'keys') match = sInst === 'keys' || sInst === 'piano' || sInst === 'e-piano';
                      else match = sInst === target;
                      return match && s.is_stage_ready;
                    }).length;
                  }

                  return (
                    <div key={inst} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '6px 10px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '1rem' }}>{renderInstrumentIcon(inst, undefined, 16)}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 900, color: count > 0 ? brandColor : '#94a3b8' }}>{count}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'inline-block', background: '#f1f5f9', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', height: 'fit-content' }}>
                  {student.instrument || 'Multi-Talent'}
                </div>
              </div>


            </div>
          </div>

          {/* Skill Radar centered dynamically in the empty space */}
          <div style={{ flex: '1 1 200px', display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: '240px' }}>
            <div style={{ width: '240px', height: '165px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'transparent' }}>
              <RadarChart cx="50%" cy="50%" outerRadius="75%" width={240} height={165} data={studentRadarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="instrument" tick={({ x, y, payload }) => (
                   <text x={x} y={y} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}>
                     {payload.value}
                   </text>
                )} />
                <Radar name="XP" dataKey="xp" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} />
              </RadarChart>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Üben Board */}
            <section>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', color: '#3b82f6', letterSpacing: '0.1em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} /> Üben Board
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {practiceBoard.map((s: any) => (
                  <div key={s.id + s.level} style={{ background: '#f8fafc', padding: '16px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>{s.artist}</div>
                        <div style={{ fontWeight: 900, fontSize: '1rem', color: '#1e293b' }}>{s.title}</div>
                      </div>
                      <div style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 900, background: s.level === 'starter' ? '#fffbeb' : '#eff6ff', color: s.level === 'starter' ? '#b45309' : '#2563eb' }}>
                        {s.level === 'starter' ? '🚀 STARTER' : '⚡ PRO'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {s.instruments.map((inst: any, idx: number) => (
                        <div 
                          key={idx} 
                          title={`${inst.name}${inst.part_number > 1 || (s.instruments.filter((i:any) => i.name === inst.name).length > 1) ? ` ${inst.part_number}` : ''}`}
                          style={{ 
                            fontSize: '0.8rem', 
                            fontWeight: 800, 
                            padding: '4px 8px', 
                            borderRadius: '8px', 
                            background: 'white', 
                            border: '1px solid #e2e8f0', 
                            color: inst.progress === 100 ? '#10b981' : (inst.progress > 0 ? brandColor : '#94a3b8'),
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'help'
                          }}
                        >
                          <span>{renderInstrumentIcon(inst.name, undefined, 14)}</span>
                          <span>{inst.progress}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {practiceBoard.length === 0 && !loading && (
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Keine Songs am Board.</div>
                )}
              </div>
            </section>

            {/* Repertoire */}
            <section>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', color: '#10b981', letterSpacing: '0.1em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={16} /> Repertoir
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {repertoire.map((s: any) => (
                  <div key={s.id + s.level} style={{ background: '#f0fdf4', padding: '16px', borderRadius: '20px', border: '1px solid #bbf7d0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#15803d', opacity: 0.7, textTransform: 'uppercase' }}>{s.artist}</div>
                        <div style={{ fontWeight: 900, fontSize: '1rem', color: '#166534' }}>{s.title}</div>
                      </div>
                      <div style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 900, background: '#dcfce7', color: '#15803d' }}>
                        {s.level === 'starter' ? '🚀 STARTER' : '⚡ PRO'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {s.instruments.filter((i: any) => i.is_stage_ready).map((inst: any, idx: number) => (
                        <div 
                          key={idx} 
                          title={`${inst.name}${inst.part_number > 1 || (s.instruments.filter((i:any) => i.name === inst.name).length > 1) ? ` ${inst.part_number}` : ''}`}
                          style={{ 
                            fontSize: '0.8rem', 
                            fontWeight: 800, 
                            padding: '4px 8px', 
                            borderRadius: '8px', 
                            background: 'white', 
                            border: '1px solid #bbf7d0', 
                            color: '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'help'
                          }}
                        >
                          <span>{renderInstrumentIcon(inst.name, undefined, 14)}</span>
                          <span>100%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {repertoire.length === 0 && !loading && (
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Noch kein Repertoir.</div>
                )}
              </div>
            </section>
          </div>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Meine Bands */}
            <section>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', color: '#ec4899', letterSpacing: '0.1em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} /> Meine Bands
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
                      gap: '12px', 
                      padding: '12px', 
                      background: '#fdf2f8', 
                      borderRadius: '16px', 
                      border: '1px solid #fbcfe8',
                      cursor: onOpenBandProfile ? 'pointer' : 'default'
                    }}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden' }}>
                      <img src={b.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#9d174d' }}>{b.name}</div>
                  </div>
                ))}
                {bands.length === 0 && !loading && (
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>In keiner Band aktiv.</div>
                )}
              </div>
            </section>

            {/* Wochenplan-Zeiten */}
            <section style={{ marginTop: '16px' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', color: '#f59e0b', letterSpacing: '0.1em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} /> Wochenplan-Zeiten
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {weekSessions.map((pres, idx) => (
                  <div key={idx} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    background: '#fffbeb', 
                    border: '1px solid #fef3c7', 
                    padding: '12px 14px', 
                    borderRadius: '16px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#b45309'
                  }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }}></div>
                    <div>
                      {pres.dayStr}. {pres.rangeStr}
                    </div>
                  </div>
                ))}
                {weekSessions.length === 0 && (
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', background: '#f8fafc', padding: '12px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>Keine reservierten Zeiten diese Woche.</div>
                )}
              </div>
            </section>
          </aside>
        </div>
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
    </div>
  );
};

