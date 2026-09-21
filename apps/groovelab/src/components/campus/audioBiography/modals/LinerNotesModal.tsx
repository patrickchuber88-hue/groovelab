import React from 'react';
import { BookOpen, X, Music, Award, Printer } from 'lucide-react';
import { CampusGroovelabText } from '../../../CampusGroovelabBrand';

interface LinerNotesModalProps {
  booklet: {
    title: string;
    gradient?: string;
    tracks: Array<{
      id: string;
      title: string;
      subtitle?: string;
      duration?: number;
      recordedAt?: string;
      personalNote?: string;
    }>;
  };
  onClose: () => void;
  student: any;
  isLight: boolean;
}

const formatSeconds = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export const LinerNotesModal: React.FC<LinerNotesModalProps> = ({
  booklet: bk,
  onClose,
  student,
  isLight
}) => {
  const colors = {
    textPrimary: isLight ? '#0f172a' : '#f8fafc',
    textSecondary: isLight ? '#475569' : '#cbd5e1',
    textMuted: isLight ? '#64748b' : '#94a3b8'
  };

  const totalDurationCalc = bk.tracks.reduce((acc, t) => acc + (t.duration || 45), 0);
  const artistName = student?.first_name
    ? `${student.first_name}${student.last_name ? ` ${student.last_name.charAt(0)}.` : ''}`
    : 'Linus';
  const instrumentName = student?.instrument || student?.main_instrument || 'Gitarre';
  const effectiveSchoolName = student?.school_name || localStorage.getItem('campus_school_name') || 'Musikschule';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Digitales Liner-Notes Booklet"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(3, 7, 18, 0.88)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '20px'
      }}
    >
      <div style={{
        background: isLight
          ? 'linear-gradient(165deg, #ffffff 0%, #fafaf9 100%)'
          : 'linear-gradient(165deg, #0f172a 0%, #090d16 100%)',
        border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '32px',
        padding: '32px',
        maxWidth: '760px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        color: colors.textPrimary,
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        boxShadow: isLight ? '0 25px 60px rgba(0,0,0,0.12)' : '0 35px 80px rgba(0, 0, 0, 0.9)',
        position: 'relative'
      }}>
        {/* 1. Top Ribbon & Close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
            }}>
              <BookOpen size={20} color="#ffffff" />
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block' }}>
                Offizielles Musikschul-Booklet • Liner-Notes
              </span>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: colors.textSecondary }}>
                {effectiveSchoolName}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Booklet schließen"
            style={{
              background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.08)',
              border: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.textPrimary,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale"
          >
            <X size={18} />
          </button>
        </div>

        {/* 2. Editorial Album Cover Header Spread */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          background: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)',
          border: isLight ? '1px solid #e2e8f0' : 'rgba(255, 255, 255, 0.06)',
          borderRadius: '20px',
          padding: '18px 20px',
          flexWrap: 'wrap'
        }}>
          <div style={{
            width: '88px',
            height: '88px',
            borderRadius: '16px',
            background: bk.gradient || 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
            position: 'relative',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            <Music size={32} color="#ffffff" strokeWidth={2.2} />
            <span style={{ fontSize: '0.54rem', fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '6px' }}>
              Meisterwerk
            </span>
          </div>

          <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.66rem',
                fontWeight: 900,
                color: '#10b981',
                background: isLight ? '#dcfce7' : 'rgba(16, 185, 129, 0.18)',
                padding: '2px 8px',
                borderRadius: '100px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}>
                {bk.tracks.length} {bk.tracks.length === 1 ? 'Titel' : 'Titel'} • {formatSeconds(totalDurationCalc)} Min.
              </span>
              <span style={{ fontSize: '0.74rem', color: colors.textSecondary, fontWeight: 700 }}>
                Schuljahr 2026/2027
              </span>
            </div>

            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: colors.textPrimary, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {bk.title}
            </h2>

            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: colors.textSecondary }}>
              von <strong style={{ color: '#10b981' }}>{artistName}</strong> • {instrumentName}
            </span>
          </div>
        </div>

        {/* 3. Pedagogical Foreword */}
        <div style={{
          padding: '12px 16px',
          borderRadius: '14px',
          background: isLight ? '#f0fdf4' : 'rgba(16, 185, 129, 0.08)',
          border: `1px solid ${isLight ? '#bbf7d0' : 'rgba(16, 185, 129, 0.2)'}`,
          fontSize: '0.78rem',
          lineHeight: 1.45,
          color: isLight ? '#166534' : '#a7f3d0',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px'
        }}>
          <Award size={18} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Musikalisches Tagebuch:</strong> Dieses digitale Booklet dokumentiert die persönliche Entwicklung und gemeisterte Meilensteine im Instrumentalunterricht.
          </div>
        </div>

        {/* 4. Track-by-Track Liner Notes Chronicle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '0.90rem', fontWeight: 900, color: colors.textPrimary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Song-Chronik & Meilensteine:
          </h4>

          {bk.tracks.map((t, idx) => {
            let cleanSubtitle = t.subtitle || '';
            if (cleanSubtitle.toLowerCase().includes('lufs') || cleanSubtitle.toLowerCase().includes('peak') || cleanSubtitle.toLowerCase().includes('match')) {
              cleanSubtitle = cleanSubtitle.toLowerCase().includes('master') ? '✨ Studio-Klang' : '🎙️ Originalaufnahme';
            }

            return (
              <div
                key={idx}
                style={{
                  background: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.55)',
                  border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '16px',
                  padding: '14px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.02)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      fontSize: '0.74rem',
                      fontWeight: 900,
                      color: '#10b981',
                      background: isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.16)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontVariantNumeric: 'tabular-nums'
                    }}>
                      #{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                    </span>
                    <strong style={{ fontSize: '0.94rem', fontWeight: 900, color: colors.textPrimary }}>
                      {t.title}
                    </strong>
                    {cleanSubtitle && (
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        color: cleanSubtitle.includes('Studio') ? '#10b981' : '#3b82f6',
                        background: cleanSubtitle.includes('Studio')
                          ? (isLight ? '#f0fdf4' : 'rgba(16, 185, 129, 0.15)')
                          : (isLight ? '#eff6ff' : 'rgba(59, 130, 246, 0.15)'),
                        padding: '2px 6px',
                        borderRadius: '6px'
                      }}>
                        {cleanSubtitle}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: colors.textSecondary, fontWeight: 600 }}>
                    <span>{t.recordedAt || '16. Aug. 2026'}</span>
                    <span>•</span>
                    <span>{formatSeconds(t.duration || 45)} Min.</span>
                  </div>
                </div>

                {t.personalNote && (
                  <div style={{
                    marginTop: '4px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.04)',
                    border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.05)',
                    fontSize: '0.78rem',
                    lineHeight: 1.4,
                    color: colors.textPrimary
                  }}>
                    <span style={{ fontStyle: 'italic' }}>„{t.personalNote}“</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 5. Official Credits & Impressum Box */}
        <div style={{
          marginTop: '6px',
          padding: '14px 18px',
          borderRadius: '16px',
          background: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)',
          border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.06)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '10px',
          fontSize: '0.72rem'
        }}>
          <div>
            <span style={{ color: colors.textSecondary, display: 'block', fontWeight: 700 }}>Interpret:</span>
            <strong style={{ color: colors.textPrimary }}>{artistName} ({instrumentName})</strong>
          </div>
          <div>
            <span style={{ color: colors.textSecondary, display: 'block', fontWeight: 700 }}>Musikschule:</span>
            <strong style={{ color: colors.textPrimary }}>{effectiveSchoolName}</strong>
          </div>
          <div>
            <span style={{ color: colors.textSecondary, display: 'block', fontWeight: 700 }}>Plattform & Audio-Tresor:</span>
            <strong style={{ color: colors.textPrimary }}><CampusGroovelabText /></strong>
          </div>
          <div>
            <span style={{ color: colors.textSecondary, display: 'block', fontWeight: 700 }}>Nutzungsbereich:</span>
            <strong style={{ color: colors.textPrimary }}>Geschützter privater Familienkreis</strong>
          </div>
        </div>

        {/* 6. Bottom Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', paddingTop: '12px', borderTop: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.08)' }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              padding: '10px 18px',
              borderRadius: '100px',
              border: isLight ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.14)',
              background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.06)',
              color: colors.textPrimary,
              fontSize: '0.80rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
            className="hover-scale"
          >
            <Printer size={15} />
            <span>Drucken / Als PDF speichern</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 24px',
              borderRadius: '100px',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              fontSize: '0.84rem',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
            }}
            className="hover-scale"
          >
            <span>Schließen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
