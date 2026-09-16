import React from 'react';
import { Users } from 'lucide-react';
import { StudioAvatar } from '../StudioAvatar';
import { APP_INSTRUMENT_ICONS, brandColor as defaultBrandColor } from '../../constants/instruments';
import { ErrorBoundary } from '../ui/ErrorBoundary';

export interface StudentTeamTabProps {
  teachers: any[];
  brandColor?: string;
  onSelectTeacher: (teacher: any) => void;
  isMobile?: boolean;
}

/**
 * 👥 StudentTeamTab
 * Bounded-context component encapsulating the "Unser Team" view for students ('team').
 * BFSG 2025 / WCAG 2.2 AA compliant with keyboard accessibility and touch targets >= 44x44px.
 */
export function StudentTeamTab({
  teachers = [],
  brandColor = defaultBrandColor,
  onSelectTeacher,
  isMobile = false
}: StudentTeamTabProps) {
  return (
    <ErrorBoundary>
      <section 
        className="exercises-section animation-slide-up" 
        style={{ padding: isMobile ? '12px' : '24px' }}
        aria-label="Unser Team"
      >
        <div 
          className="glass-panel" 
          style={{ 
            padding: isMobile ? '16px' : '32px', 
            background: 'white', 
            borderRadius: '24px', 
            border: '1px solid #f1f5f9', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.03)' 
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: isMobile ? '20px' : '32px' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '14px', 
              background: `${brandColor}15`, 
              color: brandColor, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Users size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: isMobile ? '1.35rem' : '1.75rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>
                Unser Team
              </h3>
              <p style={{ color: '#64748b', margin: 0, fontWeight: 600, fontSize: isMobile ? '0.85rem' : '1rem' }}>
                Die Köpfe hinter der GrooveLab Academy.
              </p>
            </div>
          </div>

          {/* Teachers Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: isMobile ? '16px' : '24px' 
          }}>
            {teachers.map(t => (
              <div 
                key={t.id} 
                role="button"
                tabIndex={0}
                onClick={() => onSelectTeacher(t)} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectTeacher(t);
                  }
                }}
                aria-label={`Lehrerprofil von ${t.first_name} ${t.last_name} anzeigen`}
                className="glass-panel"
                style={{ 
                  padding: isMobile ? '24px 16px' : '32px', 
                  textAlign: 'center', 
                  background: 'white', 
                  borderRadius: '32px', 
                  cursor: 'pointer',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  border: '1px solid #f1f5f9',
                  position: 'relative',
                  overflow: 'hidden',
                  willChange: 'transform',
                  backfaceVisibility: 'hidden',
                  outline: 'none',
                  minHeight: '44px',
                  touchAction: 'manipulation'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 0 2px #3b82f6, 0 10px 30px rgba(0,0,0,0.05)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  width: '100%', 
                  height: '100px', 
                  background: `linear-gradient(180deg, ${brandColor}10 0%, transparent 100%)`,
                  zIndex: 0
                }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ 
                    width: isMobile ? '90px' : '110px', 
                    height: isMobile ? '90px' : '110px', 
                    borderRadius: '40px', 
                    margin: '0 auto 20px auto', 
                    border: '5px solid white', 
                    overflow: 'hidden', 
                    boxShadow: '0 8px 20px rgba(0,0,0,0.1)' 
                  }}>
                    <StudioAvatar src={t.photo_url} user={t} />
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {(t.instrument || '').split(',').map((inst: string) => inst.trim()).filter(Boolean).map((inst: string, idx: number) => (
                        <span key={idx} style={{ fontSize: '1.25rem' }}>{APP_INSTRUMENT_ICONS[inst] || '🎸'}</span>
                      ))}
                    </div>
                    <h4 style={{ fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>
                      {t.first_name} {t.last_name}
                    </h4>
                  </div>
                  
                  <div style={{ 
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '100px',
                    background: t.role === 'admin' ? '#fef3c7' : '#f1f5f9',
                    color: t.role === 'admin' ? '#b45309' : '#64748b',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '16px'
                  }}>
                    {t.role === 'admin' ? 'Lehrer' : 'Lehrer'}
                  </div>

                  <div style={{ 
                    padding: '16px',
                    background: '#f8fafc',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    color: '#64748b',
                    fontWeight: 600,
                    lineHeight: 1.4
                  }}>
                    {t.instrument} Expert & Coach
                  </div>
                </div>
              </div>
            ))}

            {teachers.length === 0 && (
              <div style={{ 
                gridColumn: '1/-1', 
                textAlign: 'center', 
                padding: isMobile ? '40px 16px' : '8px 20px', 
                background: 'white', 
                borderRadius: '32px', 
                border: '2px dashed #f1f5f9' 
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '20px' }}>👥</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>Noch keine Lehrer hinterlegt</h3>
                <p style={{ color: '#64748b' }}>Dein Admin wird bald die Lehrer-Profile vervollständigen.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </ErrorBoundary>
  );
}
