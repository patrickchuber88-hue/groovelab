import React from 'react';
import { Moon, BookOpen, Coffee, ShieldCheck } from 'lucide-react';

export interface ParentScreenTimeSettingsViewProps {
  currentLvlKey: 'junior' | 'teen' | 'pro';
  bedtimeModeEnabled: boolean;
  bedtimeStart: string;
  bedtimeEnd: string;
  handleUpdateBedtime: (enabled: boolean, start?: string, end?: string) => Promise<void>;
  daytimeLockEnabled: boolean;
  daytimeLockStart: string;
  daytimeLockEnd: string;
  daytimeLockDays: 'school_days' | 'everyday';
  handleUpdateDaytimeLock: (enabled: boolean, start?: string, end?: string, days?: 'school_days' | 'everyday') => Promise<void>;
  instantLockUntil: number | null;
  isCurrentlyInInstantLock: boolean;
  handleSetInstantLock: (durationMinutes: number | null) => Promise<void>;
}

export const ParentScreenTimeSettingsView: React.FC<ParentScreenTimeSettingsViewProps> = ({
  currentLvlKey,
  bedtimeModeEnabled,
  bedtimeStart,
  bedtimeEnd,
  handleUpdateBedtime,
  daytimeLockEnabled,
  daytimeLockStart,
  daytimeLockEnd,
  daytimeLockDays,
  handleUpdateDaytimeLock,
  instantLockUntil,
  isCurrentlyInInstantLock,
  handleSetInstantLock,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Introduction Card */}
      <div style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)',
        borderRadius: '20px',
        padding: '20px',
        border: '1.5px solid #bae6fd',
        boxShadow: '0 4px 16px -2px rgba(2, 132, 199, 0.08)',
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '14px',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0284c7',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            flexShrink: 0
          }}>
            <Moon size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.01em' }}>
              Bildschirmzeit, Fokus &amp; Ruhezeiten
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.80rem', color: '#475569', fontWeight: 600, lineHeight: 1.4 }}>
              Gesunde digitale Balance: Schütze dein Kind vor nächtlicher Smartphone-Nutzung und Schul-Ablenkung.
            </p>
          </div>
        </div>
      </div>

      {/* Feature 1: Ruhezeiten & Nachtruhe-Schutz */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '20px',
        borderRadius: '20px',
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: '#e0f2fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0284c7',
              flexShrink: 0
            }}>
              <Moon size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0f172a' }}>
                  Nachtruhe-Schutz &amp; Ruhezeiten
                </div>
                {currentLvlKey === 'junior' && (
                  <span style={{ background: '#e0f2fe', color: '#0284c7', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>
                    Junior-Standard: 20:00 – 07:00
                  </span>
                )}
                {currentLvlKey === 'teen' && (
                  <span style={{ background: '#fef3c7', color: '#b45309', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>
                    Teen-Standard: 21:30 – 06:30
                  </span>
                )}
                {currentLvlKey === 'pro' && (
                  <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>
                    Pro-Standard: 24h Zugriff
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '3px' }}>
                {currentLvlKey === 'junior' 
                  ? 'Schützt vor Reizüberflutung und sichert gesunden Schlaf (20:00 – 07:00 Uhr). Jederzeit per Eltern-PIN entsperrbar.'
                  : currentLvlKey === 'teen'
                  ? 'Altersgerechte Ruhezeit ab 21:30 Uhr (Schutz vor nächtlichen Push-Nachrichten & Chat-Stress).'
                  : '24h freier Übezugriff für Pro-Musiker & Erwachsene. Ruhezeiten können bei Bedarf manuell aktiviert werden.'}
              </div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={bedtimeModeEnabled}
            onChange={(e) => handleUpdateBedtime(e.target.checked)}
            style={{ width: '22px', height: '22px', accentColor: '#0284c7', cursor: 'pointer', flexShrink: 0 }}
          />
        </div>

        {bedtimeModeEnabled && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            padding: '14px',
            borderRadius: '14px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            marginTop: '6px'
          }}>
            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 750, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Ruhezeit ab:
              </label>
              <select
                value={bedtimeStart}
                onChange={(e) => handleUpdateBedtime(true, e.target.value, bedtimeEnd)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  fontWeight: 750,
                  color: '#0f172a',
                  background: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                {['19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30'].map(t => (
                  <option key={t} value={t}>{t} Uhr</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 750, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Aufwachen um:
              </label>
              <select
                value={bedtimeEnd}
                onChange={(e) => handleUpdateBedtime(true, bedtimeStart, e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  fontWeight: 750,
                  color: '#0f172a',
                  background: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                {['06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00'].map(t => (
                  <option key={t} value={t}>{t} Uhr</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Feature 2: Schulzeit- & Hausaufgaben-Fokus (Tages-Sperrfenster) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '20px',
        borderRadius: '20px',
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: '#e0e7ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4f46e5',
              flexShrink: 0
            }}>
              <BookOpen size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0f172a' }}>
                  Schulzeit- &amp; Hausaufgaben-Fokus
                </div>
                <span style={{ background: '#e0e7ff', color: '#4338ca', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>
                  Tages-Sperre
                </span>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '3px' }}>
                Pausiert die App während der regulären Schulzeit oder Hausaufgaben, um Ablenkung zu vermeiden.
              </div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={daytimeLockEnabled}
            onChange={(e) => handleUpdateDaytimeLock(e.target.checked)}
            style={{ width: '22px', height: '22px', accentColor: '#4f46e5', cursor: 'pointer', flexShrink: 0 }}
          />
        </div>

        {daytimeLockEnabled && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '14px',
            borderRadius: '14px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            marginTop: '6px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 750, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Sperre ab:
                </label>
                <select
                  value={daytimeLockStart}
                  onChange={(e) => handleUpdateDaytimeLock(true, e.target.value, daytimeLockEnd, daytimeLockDays)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.84rem',
                    fontWeight: 750,
                    color: '#0f172a',
                    background: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  {['07:30', '08:00', '08:30', '09:00', '13:00', '13:30', '14:00', '14:30'].map(t => (
                    <option key={t} value={t}>{t} Uhr</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 750, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Entsperren um:
                </label>
                <select
                  value={daytimeLockEnd}
                  onChange={(e) => handleUpdateDaytimeLock(true, daytimeLockStart, e.target.value, daytimeLockDays)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.84rem',
                    fontWeight: 750,
                    color: '#0f172a',
                    background: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  {['12:00', '12:30', '13:00', '13:30', '14:00', '15:00', '15:30', '16:00', '17:00'].map(t => (
                    <option key={t} value={t}>{t} Uhr</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingTop: '4px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 750, color: '#475569' }}>Gültigkeit:</span>
              <button
                type="button"
                onClick={() => handleUpdateDaytimeLock(true, daytimeLockStart, daytimeLockEnd, 'school_days')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.74rem',
                  fontWeight: 750,
                  border: '1.5px solid',
                  borderColor: daytimeLockDays === 'school_days' ? '#6366f1' : '#cbd5e1',
                  background: daytimeLockDays === 'school_days' ? '#e0e7ff' : '#ffffff',
                  color: daytimeLockDays === 'school_days' ? '#4338ca' : '#64748b',
                  cursor: 'pointer'
                }}
              >
                Mo – Fr (Schultage)
              </button>
              <button
                type="button"
                onClick={() => handleUpdateDaytimeLock(true, daytimeLockStart, daytimeLockEnd, 'everyday')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.74rem',
                  fontWeight: 750,
                  border: '1.5px solid',
                  borderColor: daytimeLockDays === 'everyday' ? '#6366f1' : '#cbd5e1',
                  background: daytimeLockDays === 'everyday' ? '#e0e7ff' : '#ffffff',
                  color: daytimeLockDays === 'everyday' ? '#4338ca' : '#64748b',
                  cursor: 'pointer'
                }}
              >
                Täglich
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Feature 3: 1-Tap Sofortpause ("Familienzeit / Bildschirm-Auszeit") */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '20px',
        borderRadius: '20px',
        background: isCurrentlyInInstantLock ? '#fffbeb' : '#ffffff',
        border: isCurrentlyInInstantLock ? '2px solid #fde68a' : '1.5px solid #e2e8f0',
        boxShadow: isCurrentlyInInstantLock ? '0 4px 16px rgba(217, 119, 6, 0.12)' : '0 2px 10px rgba(0,0,0,0.02)',
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d97706',
              flexShrink: 0
            }}>
              <Coffee size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0f172a' }}>
                  1-Tap Sofortpause („Familienzeit“)
                </div>
                {isCurrentlyInInstantLock && (
                  <span style={{ background: '#fef3c7', color: '#b45309', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>
                    Aktiv bis {new Date(instantLockUntil!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Uhr
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '3px' }}>
                Sperrt die App sofort für gemeinsame Familienzeit oder Mahlzeiten, ohne dauerhafte Einstellungen zu verändern.
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
          <button
            type="button"
            onClick={() => handleSetInstantLock(30)}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '0.78rem',
              fontWeight: 800,
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              color: '#1e293b',
              cursor: 'pointer'
            }}
            className="hover-scale"
          >
            +30 Min. Pause
          </button>
          <button
            type="button"
            onClick={() => handleSetInstantLock(60)}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '0.78rem',
              fontWeight: 800,
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              color: '#1e293b',
              cursor: 'pointer'
            }}
            className="hover-scale"
          >
            +60 Min. (Essen/Familie)
          </button>
          <button
            type="button"
            onClick={() => handleSetInstantLock(-1)}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '0.78rem',
              fontWeight: 800,
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              color: '#1e293b',
              cursor: 'pointer'
            }}
            className="hover-scale"
          >
            Bis morgen früh
          </button>
          {isCurrentlyInInstantLock && (
            <button
              type="button"
              onClick={() => handleSetInstantLock(null)}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '0.78rem',
                fontWeight: 850,
                background: '#fee2e2',
                border: '1.5px solid #fca5a5',
                color: '#b91c1c',
                cursor: 'pointer'
              }}
              className="hover-scale"
            >
              Pause jetzt beenden
            </button>
          )}
        </div>
      </div>

      {/* Real-time Status Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        borderRadius: '14px',
        background: '#e6f4ea',
        border: '1px solid #bbf7d0',
        color: '#15803d',
        fontSize: '0.78rem',
        fontWeight: 750
      }}>
        <ShieldCheck size={16} color="#15803d" style={{ flexShrink: 0 }} />
        <span>Fokus- und Ruhezeiten werden sofort geräteübergreifend wirksam.</span>
      </div>
    </div>
  );
};
