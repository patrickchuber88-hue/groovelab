import React from 'react';
import { X, Headphones, Guitar, Music, Heart } from 'lucide-react';
import { renderInstrumentIcon } from '../utils/instruments';

interface TeacherDetailModalProps {
  teacher: any;
  onClose: () => void;
}

export const TeacherDetailModal: React.FC<TeacherDetailModalProps> = ({ teacher, onClose }) => {
  const brandColor = '#eab308'; // GrooveLab Gold
  const ADMIN_INSTRUMENT_ICONS: Record<string, any> = { 
    "Gitarre": renderInstrumentIcon("Gitarre"), 
    "Guitar": renderInstrumentIcon("Guitar"), 
    "E-Gitarre": renderInstrumentIcon("E-Gitarre"),
    "Bass": renderInstrumentIcon("Bass"), 
    "E-Bass": renderInstrumentIcon("E-Bass"), 
    "Drums": renderInstrumentIcon("Drums"), 
    "E-Drums": renderInstrumentIcon("E-Drums"), 
    "Vocals": renderInstrumentIcon("Vocals"), 
    "Gesang": renderInstrumentIcon("Gesang"),
    "Piano / Keys": renderInstrumentIcon("Keys"), 
    "Piano": renderInstrumentIcon("Piano"), 
    "E-Piano": renderInstrumentIcon("E-Piano"), 
    "Keys": renderInstrumentIcon("Keys")
  };

  const parseArray = (val: any) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        return val.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    return [];
  };

  const bio = teacher.bio || "";
  const bands = teacher.bands || "";
  const expertise = teacher.expertise || "";
  const listeningTo = teacher.listening || "";
  const gear = teacher.gear || "";
  const instruments = parseArray(teacher.instrument);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass-panel animation-slide-up" style={{ background: 'white', padding: '0', borderRadius: '32px', maxWidth: '540px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
        
        {/* Header/Cover Image effect */}
        <div style={{ height: '120px', background: `linear-gradient(135deg, ${brandColor}20, ${brandColor}40)`, position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '0 32px 40px 32px', marginTop: '-60px', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ 
              width: '120px', 
              height: '120px', 
              borderRadius: '40px', 
              margin: '0 auto 16px auto', 
              border: '6px solid white', 
              overflow: 'hidden', 
              boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
              background: '#f1f5f9',
              position: 'relative'
            }}>
              <img 
                src={teacher.photo_url || '/avatar_ghost.jpg'} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                alt="Teacher" 
              />
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, margin: '0 0 4px 0', color: '#1e293b' }}>
              {teacher.first_name} {teacher.last_name}
            </h2>
            <div style={{ fontSize: '0.85rem', color: brandColor, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Lehrer
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
              {instruments.map((inst: string) => (
                <div key={inst} style={{ background: '#f8fafc', padding: '6px 14px', borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{ADMIN_INSTRUMENT_ICONS[inst.trim()] || '🎸'}</span> {inst.trim()}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Bio section */}
            <section>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '12px', letterSpacing: '0.05em' }}>
                <Music size={14} color={brandColor} /> Musikalischer Werdegang
              </h4>
              <p style={{ fontSize: '1rem', lineHeight: 1.6, color: '#475569', margin: 0, fontWeight: 500 }}>{bio || "Kein Werdegang hinterlegt."}</p>
            </section>

            {/* Expertise */}
            <section>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '12px', letterSpacing: '0.05em' }}>
                <Guitar size={14} color={brandColor} /> Expertise & Stile
              </h4>
              <p style={{ fontSize: '0.95rem', lineHeight: 1.5, color: '#475569', margin: 0, fontWeight: 600 }}>{expertise || "Keine Expertise eingetragen."}</p>
            </section>

            {/* Bands & Projekte */}
            <section>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '12px', letterSpacing: '0.05em' }}>
                <Headphones size={14} color={brandColor} /> Bands & Projekte
              </h4>
              <p style={{ fontSize: '0.95rem', lineHeight: 1.5, color: '#475569', margin: 0, fontWeight: 600 }}>{bands || "Keine Bands oder Projekte eingetragen."}</p>
            </section>

            {/* Lieblingsbands */}
            <section style={{ background: '#fffbeb', padding: '24px', borderRadius: '24px', border: '1px solid #fef3c7' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#b45309', marginBottom: '8px' }}>
                <Heart size={14} fill="#b45309" /> Lieblingsbands
              </h4>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#78350f', lineHeight: 1.4 }}>{listeningTo || "Keine Favoriten eingetragen."}</div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
