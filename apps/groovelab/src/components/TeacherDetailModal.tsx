import React from 'react';
import { X, Star, Briefcase } from 'lucide-react';
import { renderInstrumentIcon } from '../utils/instruments';

interface TeacherDetailModalProps {
  teacher: any;
  onClose: () => void;
}

export const TeacherDetailModal: React.FC<TeacherDetailModalProps> = ({ teacher, onClose }) => {
  const brandColor: string = 'var(--primary-color, #eab308)'; // GrooveLab Gold / Dynamic Theme Accent

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

  const parseArray = (val: any): string[] => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed === '[]' || trimmed === '""' || trimmed === "''") return [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // Not JSON
      }
      return val.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  };

  const formatList = (val: any): string => {
    if (!val) return "";
    const arr = parseArray(val);
    if (arr.length > 0) return arr.join(', ');
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed === '[]' || trimmed === '""' || trimmed === "''") return "";
      return trimmed;
    }
    return "";
  };

  const bands = formatList(teacher.bands);
  const expertise = formatList(teacher.expertise);
  const instruments = parseArray(teacher.instrument);

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      zIndex: 3000, 
      background: 'rgba(15, 23, 42, 0.75)', 
      backdropFilter: 'blur(16px)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '20px' 
    }}>
      <div 
        className="glass-panel animation-slide-up" 
        style={{ 
          background: 'rgba(255, 255, 255, 0.95)', 
          backdropFilter: 'blur(20px)',
          padding: '0', 
          borderRadius: '32px', 
          maxWidth: '480px', 
          width: '100%', 
          maxHeight: '90vh', 
          overflowY: 'auto', 
          position: 'relative', 
          boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
          border: '1px solid rgba(0, 0, 0, 0.08)'
        }}
      >
        
        {/* Header cover with sleek premium gradient */}
        <div style={{ 
          height: '140px', 
          background: `linear-gradient(135deg, #1e293b 0%, #0f172a 100%)`, 
          position: 'relative',
          borderTopLeftRadius: '30px',
          borderTopRightRadius: '30px',
          overflow: 'hidden'
        }}>
          {/* Subtle decorative glow */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            left: '-50px',
            width: '150px',
            height: '150px',
            background: brandColor,
            opacity: 0.15,
            filter: 'blur(40px)',
            borderRadius: '50%'
          }} />

          <button 
            onClick={onClose} 
            style={{ 
              position: 'absolute', 
              top: 20, 
              right: 20, 
              background: 'rgba(255, 255, 255, 0.15)', 
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.2)', 
              borderRadius: '50%', 
              width: '38px', 
              height: '38px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer', 
              color: '#ffffff', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
              zIndex: 10,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '0 28px 36px 28px', marginTop: '-55px', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            {/* Avatar Container with glowing border */}
            <div style={{ 
              width: '110px', 
              height: '110px', 
              borderRadius: '28px', 
              margin: '0 auto 16px auto', 
              border: '4px solid white', 
              overflow: 'hidden', 
              boxShadow: '0 12px 28px rgba(15, 23, 42, 0.15)',
              background: '#f1f5f9',
              position: 'relative'
            }}>
              <img 
                src={teacher.photo_url || '/avatar_ghost.jpg'} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                alt={`${teacher.first_name} ${teacher.last_name}`} 
              />
            </div>

            <h2 style={{ 
              fontSize: '1.75rem', 
              fontWeight: 900, 
              margin: '0 0 8px 0', 
              color: '#0f172a',
              letterSpacing: '-0.02em',
              lineHeight: 1.2
            }}>
              {teacher.first_name} {teacher.last_name}
            </h2>

            {/* Premium Role Pill */}
            <div style={{ display: 'inline-block', marginBottom: '20px' }}>
              <span style={{ 
                background: brandColor, 
                color: brandColor === '#eab308' || brandColor.includes('yellow') ? '#1e293b' : '#ffffff',
                fontWeight: 800, 
                textTransform: 'uppercase', 
                letterSpacing: '0.08em',
                fontSize: '0.7rem',
                padding: '5px 14px',
                borderRadius: '100px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
              }}>
                Lehrer
              </span>
            </div>

            {/* Instrument pills with monochrome styling */}
            {instruments.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {instruments.map((inst: string) => {
                  const trimmed = inst.trim();
                  if (!trimmed) return null;
                  const rawIcon = ADMIN_INSTRUMENT_ICONS[trimmed];
                  return (
                    <div 
                      key={trimmed} 
                      style={{ 
                        background: 'rgba(15, 23, 42, 0.04)', 
                        padding: '6px 12px', 
                        borderRadius: '100px', 
                        border: '1px solid rgba(15, 23, 42, 0.06)', 
                        fontSize: '0.78rem', 
                        fontWeight: 700, 
                        color: '#334155', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.01)'
                      }}
                    >
                      {rawIcon && (
                        <span style={{ 
                          display: 'inline-flex', 
                          filter: 'grayscale(100%) brightness(0.25)', 
                          opacity: 0.75,
                          transform: 'scale(0.9)'
                        }}>
                          {rawIcon}
                        </span>
                      )}
                      <span>{trimmed}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Expertise Section */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.02)',
              border: '1px solid rgba(15, 23, 42, 0.04)',
              borderRadius: '20px',
              padding: '16px 20px',
              transition: 'all 0.2s'
            }}>
              <h4 style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                fontSize: '0.72rem', 
                fontWeight: 800, 
                textTransform: 'uppercase', 
                color: '#64748b', 
                margin: '0 0 10px 0', 
                letterSpacing: '0.06em' 
              }}>
                <Star size={13} style={{ color: brandColor, filter: 'grayscale(100%) brightness(0.4)' }} /> Expertise & Stile
              </h4>
              <p style={{ 
                fontSize: '0.88rem', 
                lineHeight: 1.5, 
                color: expertise ? '#334155' : '#94a3b8', 
                margin: 0, 
                fontWeight: 500,
                fontStyle: expertise ? 'normal' : 'italic'
              }}>
                {expertise || "Keine Expertise eingetragen."}
              </p>
            </div>

            {/* Bands & Projekte Section */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.02)',
              border: '1px solid rgba(15, 23, 42, 0.04)',
              borderRadius: '20px',
              padding: '16px 20px',
              transition: 'all 0.2s'
            }}>
              <h4 style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                fontSize: '0.72rem', 
                fontWeight: 800, 
                textTransform: 'uppercase', 
                color: '#64748b', 
                margin: '0 0 10px 0', 
                letterSpacing: '0.06em' 
              }}>
                <Briefcase size={13} style={{ color: brandColor, filter: 'grayscale(100%) brightness(0.4)' }} /> Bands & Projekte
              </h4>
              <p style={{ 
                fontSize: '0.88rem', 
                lineHeight: 1.5, 
                color: bands ? '#334155' : '#94a3b8', 
                margin: 0, 
                fontWeight: 500,
                fontStyle: bands ? 'normal' : 'italic'
              }}>
                {bands || "Keine Bands oder Projekte eingetragen."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
