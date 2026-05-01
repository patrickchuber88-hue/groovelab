import React, { useState, useEffect } from 'react';
import { X, Calendar, Music, Award, Star, Clock, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StudentDetailModalProps {
  student: any;
  onClose: () => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ student, onClose }) => {
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSkills = async () => {
      const { data } = await supabase
        .from('user_song_skills')
        .select('*, songs(*)')
        .eq('user_id', student.id);
      setSkills(data || []);
      setLoading(false);
    };
    fetchSkills();
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
  const practiceBoard = skills.filter(s => !s.is_stage_ready);
  const repertoire = skills.filter(s => s.is_stage_ready);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass-panel animation-slide-up" style={{ background: 'white', padding: '32px', borderRadius: '32px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
          <X size={20} />
        </button>

        <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', alignItems: 'center' }}>
          <div style={{ width: '100px', height: '100px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', border: '4px solid white' }}>
            <img src={student.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>{student.first_name} {student.last_name}</h2>
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                <Calendar size={14} /> Member seit {memberSince}
              </div>
              {age && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                  <User size={14} /> {age} Jahre
                </div>
              )}
            </div>
            <div style={{ marginTop: '8px', display: 'inline-block', background: '#f1f5f9', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {student.instrument || 'Multi-Talent'}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Practice Board */}
          <section>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', color: '#3b82f6', letterSpacing: '0.1em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} /> Üben Board
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {practiceBoard.map(s => (
                <div key={s.id} style={{ background: '#f8fafc', padding: '12px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>{s.songs?.title}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{s.songs?.artist}</div>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {repertoire.map(s => (
                <div key={s.id} style={{ background: '#f0fdf4', padding: '12px', borderRadius: '16px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#166534' }}>{s.songs?.title}</div>
                  <div style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 600 }}>{s.songs?.artist}</div>
                </div>
              ))}
              {repertoire.length === 0 && !loading && (
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Noch kein Repertoir.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
