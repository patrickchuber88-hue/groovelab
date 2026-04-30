import React from 'react';
import { X, Award, Star, Clock, Music, Shield, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StudentProfileModalProps {
  student: any;
  onClose: () => void;
}

const StudentProfileModal: React.FC<StudentProfileModalProps> = ({ student, onClose }) => {
  if (!student) return null;

  const brandColor = '#eab308'; // Default Groovelab Gold

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)' }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="glass-panel animation-slide-up" 
        style={{ 
          width: '90%', 
          maxWidth: '500px', 
          padding: '32px',
          position: 'relative',
          background: 'white',
          borderRadius: '40px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '24px', right: '24px', background: '#f1f5f9', border: 'none', padding: '10px', borderRadius: '50%', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            width: '120px', 
            height: '120px', 
            borderRadius: '35px', 
            overflow: 'hidden', 
            border: `4px solid ${brandColor}`,
            boxShadow: `0 15px 35px ${brandColor}30`,
            margin: '0 auto 20px',
            transform: 'rotate(-2deg)'
          }}>
            <img 
              src={student.photo_url || '/avatar_ghost.jpg'} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              alt={student.first_name} 
            />
          </div>
          
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: `${brandColor}15`, color: brandColor, padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '12px' }}>
            <Shield size={14} /> Artist Profile
          </div>
          
          <h1 style={{ fontSize: '2.25rem', fontWeight: 900, margin: '0 0 4px 0', color: '#0f172a', letterSpacing: '-0.02em' }}>
            {student.first_name} {student.last_name?.[0]}.
          </h1>
          <p style={{ color: '#64748b', fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>
            Level: <span style={{ color: brandColor }}>Pro Artist</span>
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '24px', border: '1px solid #f1f5f9', textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Gesamt XP</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>{student.xp || 0}</div>
          </div>
          
          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '24px', border: '1px solid #f1f5f9', textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Songs</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>{student.completed_songs || 0}</div>
          </div>
        </div>

        <div style={{ marginTop: '32px' }}>
           <h3 style={{ fontSize: '0.85rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.05em' }}>
            <Award size={18} color={brandColor} /> Erfolge
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
             <div style={{ background: '#fffbeb', border: '1px solid #fef08a', color: '#854d0e', padding: '8px 16px', borderRadius: '15px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Star size={14} fill="#eab308" /> Top Talent
             </div>
             <div style={{ background: '#f0fdf4', border: '1px solid #dcfce7', color: '#166534', padding: '8px 16px', borderRadius: '15px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={14} /> Streak 🔥
             </div>
          </div>
        </div>

        <button 
          onClick={onClose}
          style={{ 
            marginTop: '32px', 
            width: '100%', 
            background: '#0f172a', 
            color: 'white', 
            border: 'none', 
            padding: '16px', 
            borderRadius: '20px', 
            fontWeight: 800, 
            fontSize: '0.95rem', 
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)'
          }}
        >
          Profil schließen
        </button>
      </div>
    </div>
  );
};

export default StudentProfileModal;
