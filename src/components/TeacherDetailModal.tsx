import React from 'react';
import { X, Headphones, Guitar, Radio } from 'lucide-react';

interface TeacherDetailModalProps {
  teacher: any;
  onClose: () => void;
}

export const TeacherDetailModal: React.FC<TeacherDetailModalProps> = ({ teacher, onClose }) => {
  const brandColor = 'var(--primary-color)';
  const INSTRUMENT_ICONS: Record<string, string> = { Guitar: '🎸', Bass: '🎸', Drums: '🥁', Keys: '🎹', Vocals: '🎤' };
  const INSTRUMENT_COLORS: Record<string, string> = {
    Guitar: '#ef4444', // Red
    Bass: '#eab308',   // Yellow
    Drums: '#3b82f6',  // Blue
    Keys: '#a855f7',   // Purple
    Vocals: '#000000'  // Black
  };

  // Use actual data from DB, no fantasy placeholders
  const bio = teacher.bio || "";
  const bands = Array.isArray(teacher.bands) ? teacher.bands : [];
  const projects = Array.isArray(teacher.projects) ? teacher.projects : [];
  const listeningTo = teacher.listening || "";
  const gear = teacher.gear || "";


  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass-panel animation-slide-up" style={{ background: 'white', padding: '32px', borderRadius: '32px', maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ 
            width: '120px', 
            height: '120px', 
            borderRadius: '50%', 
            margin: '0 auto 16px auto', 
            border: `4px solid ${brandColor}`, 
            overflow: 'hidden', 
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            background: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            <img 
              src={teacher.photo_url || '/avatar_ghost.jpg'} 
              style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, zIndex: 2 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              alt="Teacher" 
            />
            <span style={{ fontSize: '2.5rem', fontWeight: 800, color: brandColor, zIndex: 1 }}>{teacher.first_name?.[0]}</span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>{teacher.first_name} {teacher.last_name?.[0]}.</h2>
          <div style={{ fontSize: '0.9rem', color: brandColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>
            {teacher.role === 'admin' ? 'Academy Director' : 'Groovelab Coach'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Bio section */}
          <section>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '10px' }}>
              <Radio size={14} /> Musical Journey
            </h4>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: '#475569', margin: 0, fontWeight: 500 }}>{bio || ""}</p>
          </section>

          {/* Expertise / Musical Styles */}
          <section>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '12px' }}>
              <Guitar size={14} /> Expertise
            </h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(teacher.musical_styles || []).map((style: string, idx: number) => (
                <div key={idx} style={{ background: '#f8fafc', padding: '8px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                  {style}
                </div>
              ))}
              {(!teacher.musical_styles || teacher.musical_styles.length === 0) && <div style={{ fontSize: '0.85rem', color: '#cbd5e1', fontStyle: 'italic' }}>Keine Expertise eingetragen</div>}
            </div>
          </section>

          {/* Bands & Projects */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <section>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '10px' }}>
                <Headphones size={14} /> Bands
              </h4>
              <ul style={{ padding: 0, margin: 0, listStyle: 'none', fontSize: '0.85rem', color: '#475569' }}>
                {bands.map((b: string) => <li key={b} style={{ marginBottom: '4px', fontWeight: 600 }}>• {b}</li>)}
                {bands.length === 0 && <li style={{ fontSize: '0.85rem', color: '#cbd5e1', fontStyle: 'italic' }}>Keine Bands</li>}
              </ul>
            </section>
            <section>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '10px' }}>
                <Radio size={14} /> Projekte
              </h4>
              <ul style={{ padding: 0, margin: 0, listStyle: 'none', fontSize: '0.85rem', color: '#475569' }}>
                {projects.map((p: string) => <li key={p} style={{ marginBottom: '4px', fontWeight: 600 }}>• {p}</li>)}
                {projects.length === 0 && <li style={{ fontSize: '0.85rem', color: '#cbd5e1', fontStyle: 'italic' }}>Keine Projekte</li>}
              </ul>
            </section>
          </div>

          {/* Gear & Listening */}
          <section style={{ background: '#fef3c7', padding: '16px', borderRadius: '20px', border: '1px solid #fde68a' }}>
            <div style={{ marginBottom: '12px' }}>
              <h4 style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#b45309', marginBottom: '4px' }}>Favorite Gear</h4>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#78350f' }}>{gear}</div>
            </div>
            <div>
              <h4 style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#b45309', marginBottom: '4px' }}>Currently Listening</h4>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#78350f' }}>{listeningTo}</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
