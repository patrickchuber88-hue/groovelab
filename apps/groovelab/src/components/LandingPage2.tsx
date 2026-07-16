import React from 'react';
import { Sparkles, Lock, ArrowRight, School } from 'lucide-react';

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
      background: '#09090b',
      fontFamily: '"Outfit", "Inter", system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      color: '#f4f4f5',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      {/* Dynamic background ambient glows */}
      <style>{`
        @keyframes float-glow-1 {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(40px, -60px) scale(1.2); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes float-glow-2 {
          0% { transform: translate(0px, 0px) scale(1.1); }
          50% { transform: translate(-50px, 50px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1.1); }
        }
        .ambient-glow-1 {
          position: absolute;
          top: 15%;
          left: 20%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0) 70%);
          filter: blur(60px);
          pointer-events: none;
          animation: float-glow-1 12s infinite ease-in-out;
        }
        .ambient-glow-2 {
          position: absolute;
          bottom: 15%;
          right: 20%;
          width: 550px;
          height: 550px;
          background: radial-gradient(circle, rgba(234, 179, 8, 0.08) 0%, rgba(234, 179, 8, 0) 70%);
          filter: blur(70px);
          pointer-events: none;
          animation: float-glow-2 15s infinite ease-in-out;
        }
        .glass-card {
          background: rgba(20, 20, 25, 0.65);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 32px;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.1);
          transform: translateY(0);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .glass-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.12);
          box-shadow: 0 40px 80px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.15);
        }
        .btn-primary {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-primary:hover {
          transform: scale(1.02);
          box-shadow: 0 8px 30px rgba(16, 185, 129, 0.4);
          filter: brightness(1.05);
        }
        .btn-primary:active {
          transform: scale(0.99);
        }
        .btn-secondary {
          background: rgba(255, 255, 255, 0.03);
          color: #e4e4e7;
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.07);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.15);
          transform: scale(1.02);
        }
        .btn-secondary:active {
          transform: scale(0.99);
        }
        .text-gradient {
          background: linear-gradient(135deg, #f4f4f5 10%, #a1a1aa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .legal-link {
          cursor: pointer;
          transition: color 0.2s;
        }
        .legal-link:hover {
          color: #ffffff;
          text-decoration: underline;
        }
      `}</style>

      {/* Decorative Blur Spheres */}
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>

      {/* Main Container Card */}
      <div className="glass-card" style={{
        maxWidth: '520px',
        width: '100%',
        padding: '54px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '36px',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Brand/App Title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.74rem',
            fontWeight: 800,
            color: '#10b981',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            padding: '6px 18px',
            borderRadius: '100px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.05)'
          }}>
            <Sparkles size={12} style={{ color: '#facc15' }} />
            Campus-Groovelab
          </div>
          
          <h1 className="text-gradient" style={{
            fontSize: '2.3rem',
            fontWeight: 900,
            margin: '8px 0 0 0',
            letterSpacing: '-0.04em',
            lineHeight: 1.15
          }}>
            Hier entsteht eine neue Software App.
          </h1>
        </div>

        {/* Informative Text */}
        <p style={{
          fontSize: '0.98rem',
          color: '#a1a1aa',
          lineHeight: '1.65',
          margin: 0,
          fontWeight: 450
        }}>
          Wir befinden uns gerade in der Entwicklungsphase und arbeiten intensiv an neuen, spannenden Features für deine Musikschule.
        </p>

        {/* Status / Announcement Bar */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '20px',
          padding: '18px 24px',
          width: '100%',
          boxSizing: 'border-box',
          fontSize: '0.84rem',
          color: '#a1a1aa',
          fontWeight: 500,
          lineHeight: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          textAlign: 'left'
        }}>
          <div style={{
            background: 'rgba(234, 179, 8, 0.1)',
            border: '1px solid rgba(234, 179, 8, 0.15)',
            borderRadius: '10px',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#facc15'
          }}>
            <Lock size={16} />
          </div>
          <div>
            <span style={{ color: '#f4f4f5', fontWeight: 600 }}>Plattform geschützt.</span> Falls du bereits Zugangsdaten erhalten hast, kannst du dich direkt einloggen.
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '14px', width: '100%', flexDirection: 'column' }}>
          <button
            onClick={() => onLogin()}
            className="btn-primary"
            style={{
              padding: '16px 24px',
              borderRadius: '16px',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.96rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%'
            }}
          >
            Direkt zum Login
            <ArrowRight size={16} />
          </button>
          
          <button
            onClick={() => onRegister()}
            className="btn-secondary"
            style={{
              padding: '16px 24px',
              borderRadius: '16px',
              fontWeight: 700,
              fontSize: '0.96rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%'
            }}
          >
            <School size={16} style={{ opacity: 0.8 }} />
            Als Schule registrieren
          </button>
        </div>

        {/* Footer Legal Links */}
        <div style={{
          display: 'flex',
          gap: '16px',
          fontSize: '0.74rem',
          fontWeight: 700,
          color: '#71717a',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginTop: '12px'
        }}>
          <span onClick={() => onShowPrivacy()} className="legal-link">Datenschutz</span>
          <span style={{ opacity: 0.3 }}>•</span>
          <span onClick={() => onShowAgb()} className="legal-link">AGB</span>
          <span style={{ opacity: 0.3 }}>•</span>
          <span onClick={() => onShowImpressum()} className="legal-link">Impressum</span>
        </div>
      </div>
    </div>
  );
};
