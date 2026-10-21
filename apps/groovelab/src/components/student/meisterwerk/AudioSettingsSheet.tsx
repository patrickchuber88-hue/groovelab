import React, { useState, useEffect } from 'react';
import { 
  X, 
  Volume2, 
  Headphones, 
  Bluetooth, 
  RotateCcw, 
  Play, 
  CheckCircle2, 
  Sliders, 
  Sparkles,
  Info,
  Mic,
  Zap,
  Radio,
  Laptop,
  AlertCircle
} from 'lucide-react';
import { audioLatencyService, AudioRouteInfo } from '../../../services/audioLatencyService';

interface AudioSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioSettingsSheet: React.FC<AudioSettingsSheetProps> = ({
  isOpen,
  onClose
}) => {
  const [routeInfo, setRouteInfo] = useState<AudioRouteInfo | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [calibrationStatus, setCalibrationStatus] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [promptReason, setPromptReason] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setPromptReason(audioLatencyService.getPendingPromptReason());

    // Refresh audio route on open (matches active user & current hardware device)
    audioLatencyService.refreshRoute().then(setRouteInfo);

    // Subscribe to dynamic route changes (e.g. plugging in headphones or connecting AirPods)
    const unsubscribe = audioLatencyService.subscribe((info) => {
      setRouteInfo(info);
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  // Escape key listener for accessibility (BFSG 2025 / WCAG 2.2 AA)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleCloseModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Toast timer
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  const handleCloseModal = (proceedIfCalibrated: boolean = false) => {
    if (proceedIfCalibrated && audioLatencyService.isCurrentRouteCalibrated()) {
      audioLatencyService.clearPendingPrompt(true);
    } else {
      audioLatencyService.clearPendingPrompt(false);
    }
    setPromptReason(null);
    onClose();
  };

  const handleSkipForSession = () => {
    audioLatencyService.dismissPromptForSession();
    setPromptReason(null);
    onClose();
  };

  const handleStartCalibration = async () => {
    if (isCalibrating) return;
    setIsCalibrating(true);
    setCalibrationProgress(5);
    setCalibrationStatus('Messung vorbereiten...');

    try {
      const result = await audioLatencyService.runAcousticCalibration((progress, statusText) => {
        setCalibrationProgress(progress);
        setCalibrationStatus(statusText);
      });
      setSuccessToast(`Perfekt! Latenz auf ${result.latencyMs > 0 ? `+${result.latencyMs}` : result.latencyMs} ms für dieses Gerät gespeichert.`);
      const updated = await audioLatencyService.refreshRoute();
      setRouteInfo(updated);
    } catch (err: any) {
      console.warn('[AudioSettingsSheet] Calibration error:', err);
      setCalibrationStatus(err?.message || 'Kalibrierung fehlgeschlagen. Bitte Mikrofonzugriff erlauben.');
    } finally {
      setIsCalibrating(false);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    audioLatencyService.setManualLatencyMs(val, 'manual_slider');
  };

  const handleReset = () => {
    const reset = audioLatencyService.resetToBaseline();
    if (reset) {
      setRouteInfo({ ...reset });
      setSuccessToast(`Standard-Latenz (${reset.baselineLatencyMs} ms) wiederhergestellt.`);
    }
  };

  if (!isOpen) return null;

  const currentMs = routeInfo?.effectiveLatencyMs ?? 70;
  const isBluetooth = routeInfo?.isBluetooth;
  const isCalibrated = Boolean(routeInfo?.isCalibrated);
  const savedDevices = routeInfo?.savedDevices || [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Audio- & Latenz-Einstellungen"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 100010,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={() => handleCloseModal(true)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.08)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90dvh',
          animation: 'campusFadeIn 0.18s ease-out'
        }}
      >
        <style>{`
          @keyframes campusFadeIn {
            from { opacity: 0; transform: scale(0.96) translateY(8px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* 🏷️ HEADER */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fafafa'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Sliders size={18} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ fontSize: '0.98rem', fontWeight: 850, color: '#0f172a', letterSpacing: '-0.01em' }}>
                Audio & Latenz
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                Hardware-Erkennung & Aufnahme-Kompensation
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCloseModal(true)}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.15s ease'
            }}
            title="Schließen"
            aria-label="Schließen"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        {/* 📜 CONTENT */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Toast Notification */}
          {successToast && (
            <div style={{
              background: '#f0fdf4',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#15803d',
              fontSize: '0.78rem',
              fontWeight: 750
            }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{successToast}</span>
            </div>
          )}

          {/* ⚡ JUST-IN-TIME ERST-KALIBRIERUNGS-AUFFORDERUNG FÜR NEUE GERÄTE */}
          {!isCalibrated && (
            <div style={{
              background: '#fef3c7',
              border: 'none',
              borderRadius: '14px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              color: '#92400e'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.78rem', fontWeight: 850 }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>
                  {promptReason
                    ? `Gerät vor ${promptReason} einmalig kalibrieren`
                    : 'Dieses Gerät ist noch nicht kalibriert'}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', lineHeight: 1.45, fontWeight: 600 }}>
                Für <strong>{routeInfo?.deviceName || 'dieses Audio-Gerät'}</strong> liegt noch kein eigener Messwert vor (aktuell Schätzwert {routeInfo?.baselineLatencyMs ?? 70} ms). Starte jetzt die 3-Sekunden-Messung, um den perfekten Wert dauerhaft für dieses Gerät zu speichern.
              </div>
            </div>
          )}

          {/* 🎧 SIGNAL-KETTE: AUSGABE ── [ ROUNDTRIP OFFSET ] ── EINGABE */}
          <div style={{
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '18px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px'
            }}>
              {/* LINKS: AUSGABE */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '11px',
                  background: isBluetooth ? '#0f172a' : '#ffffff',
                  border: isBluetooth ? 'none' : '1px solid #cbd5e1',
                  color: isBluetooth ? '#ffffff' : '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  flexShrink: 0
                }}>
                  {isBluetooth ? (
                    <Bluetooth size={18} strokeWidth={2.2} />
                  ) : routeInfo?.routeType === 'headphones' ? (
                    <Headphones size={18} strokeWidth={2.2} />
                  ) : (
                    <Volume2 size={18} strokeWidth={2.2} />
                  )}
                </div>
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Wiedergabe
                  </div>
                  <div style={{ fontSize: '0.80rem', fontWeight: 850, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={routeInfo?.deviceName}>
                    {routeInfo?.deviceName || 'Lautsprecher'}
                  </div>
                </div>
              </div>

              {/* MITTE: ROUNDTRIP LATENZ-BADGE */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 10px',
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                flexShrink: 0
              }}>
                <div style={{ fontSize: '0.96rem', fontWeight: 900, color: isBluetooth ? '#0284c7' : '#0f172a', fontFamily: 'monospace', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  {currentMs > 0 ? `+${currentMs}` : currentMs} <span style={{ fontSize: '0.68rem', fontWeight: 750 }}>ms</span>
                </div>
                <div style={{ fontSize: '0.58rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Roundtrip
                </div>
              </div>

              {/* RECHTS: EINGABE (MIKROFON) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', minWidth: 0, flex: 1, textAlign: 'right' }}>
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34a853', display: 'inline-block' }} />
                    <span>Aufnahme</span>
                  </div>
                  <div style={{ fontSize: '0.80rem', fontWeight: 850, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={routeInfo?.inputDeviceName}>
                    {routeInfo?.inputDeviceName || 'Mikrofon'}
                  </div>
                </div>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '11px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  flexShrink: 0
                }}>
                  <Mic size={18} strokeWidth={2.2} />
                </div>
              </div>
            </div>

            {/* ROUTEN-META-ZEILE MIT KALIBRIERUNGS-STATUS */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '6px',
              fontSize: '0.68rem',
              color: '#64748b',
              fontWeight: 650,
              paddingTop: '8px',
              borderTop: '1px dashed #e2e8f0'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>Hardware-Route:</span>
                <strong style={{ color: '#0f172a' }}>{routeInfo?.routeType.toUpperCase()}</strong>
                <span>· Baseline: <strong style={{ color: '#0f172a' }}>{routeInfo?.baselineLatencyMs ?? 70} ms</strong></span>
              </span>
              <span style={{
                padding: '2px 8px',
                borderRadius: '100px',
                border: 'none',
                fontSize: '0.64rem',
                fontWeight: 800,
                background: isCalibrated ? '#dcfce7' : '#f1f5f9',
                color: isCalibrated ? '#166534' : '#475569'
              }}>
                {isCalibrated ? '✓ Gerät kalibriert' : 'Standard-Schätzwert'}
              </span>
            </div>
          </div>

          {/* ⚡ 1-KLICK AKUSTISCHE KALIBRIERUNG */}
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1.5px solid #e2e8f0',
            borderRadius: '18px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.84rem', fontWeight: 850, color: '#0f172a' }}>
                <Sparkles size={15} style={{ color: '#6366f1' }} />
                <span>Akustische Auto-Kalibrierung</span>
              </div>
              <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#4338ca', background: '#e0e7ff', padding: '2px 8px', borderRadius: '100px', border: 'none' }}>
                ±2 ms Präzision
              </span>
            </div>

            <p style={{ margin: 0, fontSize: '0.74rem', color: '#475569', lineHeight: 1.45 }}>
              Spielt 3 kurze, dezente Test-Signale ab, misst die exakte akustische Laufzeit über dein Mikrofon und speichert sie für dieses Gerät.
            </p>

            {isCalibrating && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '4px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 800, color: '#0f172a' }}>
                  <span>{calibrationStatus}</span>
                  <span>{calibrationProgress}%</span>
                </div>
                <div style={{ height: '6px', width: '100%', background: '#e2e8f0', borderRadius: '100px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${calibrationProgress}%`,
                    background: 'linear-gradient(90deg, #6366f1, #3b82f6)',
                    borderRadius: '100px',
                    transition: 'width 0.2s ease'
                  }} />
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={isCalibrating}
              onClick={handleStartCalibration}
              style={{
                background: isCalibrating 
                  ? '#94a3b8' 
                  : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '11px 16px',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: isCalibrating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: isCalibrating ? 'none' : '0 4px 12px -2px rgba(49, 46, 129, 0.35)',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale-mini"
            >
              <Play size={13} fill="#ffffff" />
              <span>
                {isCalibrating
                  ? 'Messe Laufzeit...'
                  : isCalibrated
                    ? 'Signal-Messung neu starten (3 Sek.)'
                    : 'Signal-Messung starten (3 Sek.)'}
              </span>
            </button>
          </div>

          {/* 🎚️ MANUELLE FEINEINSTELLUNG & QUICK-PRESETS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 850, color: '#0f172a' }}>
                Feinjustierung & Schnellauswahl
              </span>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.70rem',
                  fontWeight: 750,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 4px'
                }}
                title="Auf Standard zurücksetzen"
              >
                <RotateCcw size={11} />
                <span>Standard</span>
              </button>
            </div>

            {/* 3 ONE-TAP PRESET PILLS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { label: 'Kabel / Intern', value: routeInfo && !routeInfo.isBluetooth ? routeInfo.baselineLatencyMs : 70, icon: <Zap size={12} color="#0f172a" /> },
                { label: 'AirPods / BT', value: 210, icon: <Bluetooth size={12} color="#0284c7" /> },
                { label: 'HiFi / AirPlay', value: 420, icon: <Radio size={12} color="#64748b" /> }
              ].map((p) => {
                const isSelected = Math.abs(currentMs - p.value) <= 15;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      audioLatencyService.setManualLatencyMs(p.value, 'preset');
                      audioLatencyService.refreshRoute().then(setRouteInfo);
                    }}
                    style={{
                      background: isSelected ? '#0f172a' : '#ffffff',
                      border: isSelected ? 'none' : '1.5px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '7px 6px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '3px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 6px rgba(15, 23, 42, 0.18)' : 'none'
                    }}
                    className="hover-scale-mini"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', fontWeight: 800, color: isSelected ? '#ffffff' : '#0f172a' }}>
                      {p.icon}
                      <span>{p.label}</span>
                    </div>
                    <span style={{ fontSize: '0.64rem', fontWeight: 700, color: isSelected ? '#cbd5e1' : '#64748b', fontFamily: 'monospace' }}>
                      ~{p.value} ms
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '2px' }}>
              <input
                type="range"
                min="-100"
                max="450"
                step="1"
                value={currentMs}
                onChange={handleSliderChange}
                aria-label="Latenz-Feinjustierung in Millisekunden"
                style={{
                  flex: 1,
                  accentColor: '#0f172a',
                  cursor: 'pointer'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>
              <span>-100 ms (Früher)</span>
              <span style={{ color: '#0f172a', fontWeight: 900, fontFamily: 'monospace' }}>{currentMs > 0 ? `+${currentMs}` : currentMs} ms</span>
              <span>+450 ms (Später / BT)</span>
            </div>
          </div>

          {/* 💻 MULTI-DEVICE ÜBERSICHT DES USERS */}
          {savedDevices.length > 0 && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 800, color: '#475569' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Laptop size={12} />
                  <span>Gespeicherte Geräte-Kalibrierungen ({savedDevices.length})</span>
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '96px', overflowY: 'auto' }}>
                {savedDevices.slice(0, 5).map((dev) => {
                  const isActiveDev = dev.profile_key === routeInfo?.profileKey;
                  return (
                    <div
                      key={dev.profile_key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '5px 8px',
                        borderRadius: '8px',
                        background: isActiveDev ? '#e0e7ff' : '#ffffff',
                        border: 'none',
                        fontSize: '0.68rem',
                        color: isActiveDev ? '#312e81' : '#334155',
                        fontWeight: isActiveDev ? 800 : 650
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '72%' }}>
                        {dev.device_name} · {dev.route_type.toUpperCase()}
                        {isActiveDev ? ' (Aktiv)' : ''}
                      </span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 850 }}>
                        {dev.latency_ms > 0 ? `+${dev.latency_ms}` : dev.latency_ms} ms
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ℹ️ DIDAKTISCHER ZERO-LATENCY HINWEIS */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            fontSize: '0.72rem',
            color: '#475569',
            lineHeight: 1.45
          }}>
            <Info size={15} style={{ flexShrink: 0, marginTop: '1px', color: '#0284c7' }} />
            <div>
              <strong style={{ color: '#0f172a' }}>🎯 Zero-Latency Sync:</strong> Gleicht die Verzögerung bei Aufnahmen zu PlayAlongs oder Backing Tracks automatisch pro Gerät aus, sodass die Spur sample-genau im Takt sitzt.
            </div>
          </div>

        </div>

        {/* 🦶 FOOTER */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #f1f5f9',
          background: '#fafafa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: promptReason && !isCalibrated ? 'space-between' : 'flex-end',
          gap: '10px'
        }}>
          {promptReason && !isCalibrated && (
            <button
              type="button"
              onClick={handleSkipForSession}
              style={{
                background: '#f1f5f9',
                color: '#475569',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 14px',
                fontSize: '0.74rem',
                fontWeight: 750,
                cursor: 'pointer'
              }}
            >
              Später ({routeInfo?.baselineLatencyMs ?? 70} ms Standard nutzen)
            </button>
          )}
          <button
            type="button"
            onClick={() => handleCloseModal(true)}
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 22px',
              fontSize: '0.80rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale-mini"
          >
            {promptReason && isCalibrated ? 'Weiter zur Aufnahme' : 'Fertig'}
          </button>
        </div>

      </div>
    </div>
  );
};
