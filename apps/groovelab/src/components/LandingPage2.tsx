import React from 'react';

interface LandingPage2Props {
  onLogin: () => void;
  onRegister: (email?: string) => void;
  onShowPrivacy: () => void;
  onShowAgb: () => void;
  onShowImpressum: () => void;
}

export const LandingPage2: React.FC<LandingPage2Props> = ({ 
  onLogin, 
  onRegister,
  onShowPrivacy,
  onShowAgb,
  onShowImpressum
}) => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      color: '#0f172a',
      textAlign: 'center',
      boxSizing: 'border-box'
    }}>
      <div style={{
        maxWidth: '560px',
        width: '100%',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '32px',
        padding: '48px 32px',
        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '32px'
      }}>
        {/* Brand/App Title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '0.74rem',
            fontWeight: 800,
            color: '#137333',
            background: '#e6f4ea',
            padding: '6px 16px',
            borderRadius: '100px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}>
            Campus-Groovelab
          </span>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 900,
            margin: '12px 0 0 0',
            letterSpacing: '-0.03em',
            color: '#0f172a',
            lineHeight: 1.2
          }}>
            Hier entsteht eine neue Software App.
          </h1>
        </div>

        {/* Informative Text */}
        <p style={{
          fontSize: '0.95rem',
          color: '#475569',
          lineHeight: '1.6',
          margin: 0,
          fontWeight: 500
        }}>
          Wir befinden uns gerade in der Entwicklungsphase und arbeiten intensiv an neuen, spannenden Features für deine Musikschule.
        </p>

        {/* Notification / Call to action widget */}
        <div style={{
          background: '#f8fafc',
          border: '1px dashed #cbd5e1',
          borderRadius: '16px',
          padding: '20px',
          width: '100%',
          boxSizing: 'border-box',
          fontSize: '0.84rem',
          color: '#64748b',
          fontWeight: 550,
          lineHeight: 1.5
        }}>
          🔧 Die Plattform wird bald verfügbar sein. Falls du bereits Zugangsdaten erhalten hast, kannst du dich direkt einloggen.
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px', width: '100%', flexDirection: 'column' }}>
          <button
            onClick={() => onLogin()}
            style={{
              padding: '16px',
              borderRadius: '16px',
              background: '#137333',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(19, 115, 51, 0.15)',
              transition: 'transform 0.2s',
              width: '100%'
            }}
            className="hover-scale"
          >
            Direkt zum Login
          </button>
          
          <button
            onClick={() => onRegister()}
            style={{
              padding: '16px',
              borderRadius: '16px',
              background: 'transparent',
              color: '#475569',
              border: '1px solid #cbd5e1',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              width: '100%'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#475569';
            }}
          >
            Als Schule registrieren
          </button>
        </div>

        {/* Footer Legal Links */}
        <div style={{
          display: 'flex',
          gap: '16px',
          fontSize: '0.78rem',
          fontWeight: 700,
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginTop: '8px'
        }}>
          <span onClick={() => onShowPrivacy()} style={{ cursor: 'pointer', transition: 'color 0.2s' }} className="hover-underline">Datenschutz</span>
          <span style={{ opacity: 0.5 }}>•</span>
          <span onClick={() => onShowAgb()} style={{ cursor: 'pointer', transition: 'color 0.2s' }} className="hover-underline">AGB</span>
          <span style={{ opacity: 0.5 }}>•</span>
          <span onClick={() => onShowImpressum()} style={{ cursor: 'pointer', transition: 'color 0.2s' }} className="hover-underline">Impressum</span>
        </div>
      </div>
    </div>
  );
};
