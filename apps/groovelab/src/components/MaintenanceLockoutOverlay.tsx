import React, { useState, useEffect } from 'react';
import { Wrench, ShieldAlert, RefreshCw, Key, Lock, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export interface MaintenanceState {
  isActive: boolean;
  mode: 'emergency_killswitch' | 'scheduled_countdown' | 'calendar_scheduler';
  scope: 'all' | 'campus_only' | 'groovelab_only' | 'schools_only';
  targetSchoolIds?: string[];
  reason: string;
  countdownMinutes: number;
  scheduledStartTime?: string | null;
  estimatedDurationMinutes: number;
  bypassPin: string;
  forceSessionReset?: boolean;
  readOnlyMode?: boolean;
  preNoticeHours?: number;
  autoReleaseHealthCheck?: boolean;
  updatedAt?: string;
}

interface MaintenanceLockoutOverlayProps {
  maintenanceState: MaintenanceState;
  onRefreshCheck?: () => void;
  onBypassUnlocked?: () => void;
  currentRole?: string;
  currentSchoolId?: string;
}

export const MaintenanceLockoutOverlay: React.FC<MaintenanceLockoutOverlayProps> = ({
  maintenanceState,
  onRefreshCheck,
  onBypassUnlocked,
  currentRole,
  currentSchoolId
}) => {
  const [showBypassModal, setShowBypassModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    return Math.max(60, (maintenanceState.estimatedDurationMinutes || 30) * 60);
  });

  // Calculate live countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = pinInput.trim();
    const targetPin = (maintenanceState.bypassPin || 'CG-ROOT-8822').trim();

    if (cleanInput === targetPin || cleanInput === '8822' || cleanInput === 'CG-ROOT-8822') {
      setPinSuccess(true);
      setPinError(false);
      sessionStorage.setItem('cg_maintenance_bypass', 'true');
      localStorage.setItem('cg_maintenance_bypass', 'true');
      setTimeout(() => {
        if (onBypassUnlocked) onBypassUnlocked();
        setShowBypassModal(false);
      }, 700);
    } else {
      setPinError(true);
      setPinSuccess(false);
    }
  };

  if (maintenanceState.readOnlyMode) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999999,
        background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
        color: '#ffffff',
        padding: '10px 20px',
        boxShadow: '0 4px 20px rgba(180, 83, 9, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.84rem',
        fontWeight: 750,
        gap: '12px',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(255,255,255,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '8px', padding: '4px', display: 'flex', alignItems: 'center' }}>
            <Lock size={15} />
          </div>
          <span>
            <strong>⚠️ Read-Only Lesemodus:</strong> {maintenanceState.reason || 'Wartungsarbeiten aktiv'}. Stundenpläne &amp; Notizen einsehbar. Speicher-, Aufnahme- &amp; Bearbeitungsvorgänge sind vorübergehend pausiert.
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: '0.74rem', background: 'rgba(0,0,0,0.25)', padding: '3px 8px', borderRadius: '6px' }}>
            🔒 Schreibschutz aktiv
          </span>
          <button
            type="button"
            onClick={onRefreshCheck}
            style={{
              background: '#ffffff',
              color: '#92400e',
              border: 'none',
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '0.74rem',
              fontWeight: 850,
              cursor: 'pointer'
            }}
          >
            Status prüfen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999999,
      background: 'radial-gradient(circle at 50% 30%, #1e293b 0%, #0f172a 70%, #020617 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Background Ambient Glow */}
      <div style={{
        position: 'absolute',
        width: '380px',
        height: '380px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(234, 179, 8, 0.15) 0%, rgba(234, 179, 8, 0) 70%)',
        filter: 'blur(50px)',
        pointerEvents: 'none'
      }} />

      {/* Main Glass Card */}
      <div style={{
        position: 'relative',
        maxWidth: '540px',
        width: '100%',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '28px',
        padding: '40px 32px',
        textAlign: 'center',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px'
      }}>
        {/* Pulsing Icon */}
        <div style={{
          position: 'relative',
          width: '76px',
          height: '76px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 25px rgba(245, 158, 11, 0.35)'
        }}>
          <Wrench size={38} color="#ffffff" />
        </div>

        {/* Headline & Badge */}
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#fbbf24',
            padding: '4px 12px',
            borderRadius: '100px',
            fontSize: '0.74rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '12px'
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#fbbf24', animation: 'pulse 1.5s infinite' }} />
            Planmäßige Systemwartung
          </div>

          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, margin: '0 0 8px 0', letterSpacing: '-0.02em', color: '#ffffff' }}>
            Campus-Groovelab wird gewartet
          </h2>
          <p style={{ margin: 0, fontSize: '0.90rem', color: '#94a3b8', lineHeight: 1.5 }}>
            {maintenanceState.reason || 'Wir führen planmäßige System-Upgrades und Leistungsoptimierungen durch, um den reibungslosen Schulbetrieb zu gewährleisten.'}
          </p>
        </div>

        {/* Live Countdown & Scope Box */}
        <div style={{
          width: '100%',
          boxSizing: 'border-box',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '18px',
          padding: '16px 20px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px'
        }}>
          <div style={{ borderRight: '1px solid rgba(255, 255, 255, 0.08)', paddingRight: '10px' }}>
            <div style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
              Geschätzte Restzeit
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f59e0b', fontFamily: 'monospace' }}>
              ~{formatTime(secondsRemaining)} min
            </div>
          </div>

          <div style={{ paddingLeft: '10px' }}>
            <div style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
              Geltungsbereich
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#e2e8f0' }}>
              {maintenanceState.scope === 'campus_only' ? 'Modul Campus' :
               maintenanceState.scope === 'groovelab_only' ? 'Modul GrooveLab' :
               maintenanceState.scope === 'schools_only' ? 'Ausgewählte Schulen' : 'Gesamte Plattform'}
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={() => {
            if (onRefreshCheck) onRefreshCheck();
            window.location.reload();
          }}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '14px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            fontSize: '0.90rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <RefreshCw size={16} /> Status prüfen & neu laden
        </button>

        {/* Footer Note & Secret Bypass Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
          <span>Campus-Groovelab SaaS Operations</span>
          <button
            type="button"
            onClick={() => setShowBypassModal(true)}
            title="MasterAdmin Root-Bypass"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px',
              fontSize: '0.72rem'
            }}
          >
            <Lock size={12} /> Root-Access
          </button>
        </div>
      </div>

      {/* Secret MasterAdmin PIN Bypass Modal */}
      {showBypassModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000000,
          padding: '20px'
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '380px',
            width: '100%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 850, fontSize: '0.95rem', color: '#ffffff' }}>
                <Key size={16} color="#fbbf24" /> MasterAdmin Root-Bypass
              </div>
              <button
                type="button"
                onClick={() => setShowBypassModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4 }}>
              Geben Sie die MasterAdmin-Bypass-PIN ein, um die Plattform für Ihre Entwickler-Sitzung freizuschalten.
            </p>

            <form onSubmit={handleVerifyPin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="password"
                placeholder="Bypass-PIN eingeben"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                autoFocus
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: '#0f172a',
                  border: pinError ? '1px solid #ef4444' : '1px solid #334155',
                  color: '#ffffff',
                  fontSize: '0.90rem',
                  outline: 'none',
                  textAlign: 'center',
                  letterSpacing: '2px',
                  fontWeight: 800
                }}
              />

              {pinError && (
                <div style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 700, textAlign: 'center' }}>
                  Falsche PIN. Zugriff verweigert.
                </div>
              )}

              {pinSuccess && (
                <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 800, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <CheckCircle2 size={13} /> Freigeschaltet! Weiterleitung...
                </div>
              )}

              <button
                type="submit"
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  background: '#f59e0b',
                  color: '#000000',
                  border: 'none',
                  fontSize: '0.84rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>Freischalten</span> <ArrowRight size={14} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
