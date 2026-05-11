import React, { useState, useEffect } from 'react';
import { X, Calendar, Music, Award, Star, Clock, User, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

const STUDENT_MODAL_INSTRUMENT_ICONS: Record<string, string> = { Guitar: '🎸', Keys: '🎹', Drums: '🥁', Bass: '🎸', Vocals: '🎤' };
const brandColor = 'var(--primary-color)';

interface StudentDetailModalProps {
  student: any;
  onClose: () => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ student, onClose }) => {
  const [skills, setSkills] = useState<any[]>([]);
  const [bands, setBands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch skills
      const { data: skillsData } = await supabase
        .from('user_song_skills')
        .select('*, songs(*)')
        .eq('user_id', student.id);
      setSkills(skillsData || []);

      // Fetch bands
      const { data: bandsData } = await supabase
        .from('band_members')
        .select('bands(*)')
        .eq('user_id', student.id);
      
      const uniqueBands = (bandsData || [])
        .map((m: any) => Array.isArray(m.bands) ? m.bands[0] : m.bands)
        .filter(Boolean);
      setBands(uniqueBands);

      setLoading(false);
    };
    fetchData();
  }, [student.id]);

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  };

  const memberSince = new Date(student.created_at).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const age = calculateAge(student.birth_date);

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
      progress: s.progress_percent || 0,
      is_stage_ready: s.is_stage_ready
    });
    return acc;
  }, {});

  const songsArray = Object.values(groupedSongs);
  const practiceBoard = songsArray.filter((s: any) => s.instruments.some((i: any) => i.progress > 0 && !i.is_stage_ready));
  const repertoire = songsArray.filter((s: any) => s.instruments.some((i: any) => i.is_stage_ready));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass-panel animation-slide-up" style={{ background: 'white', padding: '32px', borderRadius: '32px', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
          <X size={20} />
        </button>

        <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', alignItems: 'center' }}>
          <div style={{ width: '100px', height: '100px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', border: '4px solid white' }}>
            <img src={student.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>{student.first_name} {student.last_name}</h2>
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                <Calendar size={14} /> Member seit {memberSince}
              </div>
              {(student.age || age) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                  <User size={14} /> {student.age || age} Jahre
                </div>
              )}
              <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', padding: '4px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 950, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)' }}>
                <Star size={12} fill="white" /> {skills.filter(s => s.is_stage_ready).length * 100} XP
              </div>
            </div>
            
            {/* Instrument Master Counters */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
              {['Guitar', 'Keys', 'Drums', 'Bass', 'Vocals'].map(inst => {
                const count = skills.filter(s => {
                  const sInst = s.instrument?.toLowerCase();
                  const target = inst.toLowerCase();
                  let match = false;
                  if (target === 'guitar') match = sInst === 'guitar' || sInst === 'e-gitarre';
                  else if (target === 'bass') match = sInst === 'bass' || sInst === 'e-bass';
                  else if (target === 'drums') match = sInst === 'drums' || sInst === 'e-drums';
                  else if (target === 'keys') match = sInst === 'keys' || sInst === 'piano' || sInst === 'e-piano';
                  else if (target === 'vocals') match = sInst === 'vocals' || sInst === 'gesang';
                  else match = sInst === target;
                  return match && s.is_stage_ready;
                }).length;

                return (
                  <div key={inst} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '6px 10px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '1rem' }}>{STUDENT_MODAL_INSTRUMENT_ICONS[inst] || '🎵'}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 900, color: count > 0 ? brandColor : '#94a3b8' }}>{count}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: '8px', display: 'inline-block', background: '#f1f5f9', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {student.instrument || 'Multi-Talent'}
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
                        <div key={idx} style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: '8px', background: 'white', border: '1px solid #e2e8f0', color: inst.progress === 100 ? '#10b981' : (inst.progress > 0 ? brandColor : '#94a3b8') }}>
                          {STUDENT_MODAL_INSTRUMENT_ICONS[inst.name] || '🎵'} {inst.name}{inst.part_number > 1 || (s.instruments.filter((i:any) => i.name === inst.name).length > 1) ? ` ${inst.part_number}` : ''}: {inst.progress}%
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
                        <div key={idx} style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: '8px', background: 'white', border: '1px solid #bbf7d0', color: '#10b981' }}>
                          {STUDENT_MODAL_INSTRUMENT_ICONS[inst.name] || '🎵'} {inst.name}{inst.part_number > 1 || (s.instruments.filter((i:any) => i.name === inst.name).length > 1) ? ` ${inst.part_number}` : ''}
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
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#fdf2f8', borderRadius: '16px', border: '1px solid #fbcfe8' }}>
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
          </aside>
        </div>
      </div>
    </div>
  );
};

