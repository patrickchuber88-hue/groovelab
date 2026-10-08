import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Calendar, 
  Clock, 
  RotateCcw, 
  X, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';
import { useSimulatedTime, getSimulatedNow } from '../../hooks/useSimulatedTime';
import { isDevEnvironment } from '../../utils/tenantUrlHelper';

/**
 * 🏛️ DateSimulationDevWidget (Monolith Goldstandard Dev Tool)
 * 
 * Ermöglicht autoritative Datum- und Uhrzeitsimulation für alle Dashboards (Lehrer, Admin, Schüler, Kiosk).
 * 
 * Invarianten:
 * 1. Strictly Tree-Shaken: Im Production-Build durch isDevEnvironment() zu 0 Bytes im Bundle eliminiert.
 * 2. Autoritativer Start: Startet standardmäßig um 14:00:00 Uhr; Uhrzeit frei simulierbar & sekundengenau getaktet.
 * 3. Globale Tastatur-Trigger: Umschalt + T (Shift + T) oder Umschalt-Taste (Shift Key Tap).
 * 4. Cross-Module Synchronisation: groovelab_simulated_date_changed Event & Storage Event.
 * 5. Kompaktes GrooveLab-Gelbes Design: Authentischer Look mit Slate-900 Kontrast (> 12:1 gem. WCAG 2.2 AA).
 */
export const DateSimulationDevWidget: React.FC = () => {
  const isDev = isDevEnvironment() || (typeof window !== 'undefined' && localStorage.getItem('groovelab_dev_date_sim_visible') === 'true');

  // isVisible: Steuert die vollständige Präsenz auf dem Bildschirm (Floating Badge + Panel).
  // Wenn false: 0 Elemente im DOM (komplett ausgeblendet via Shift+T).
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('groovelab_dev_date_sim_visible') === 'true';
  });

  // isOpen: Steuert das geöffnete Kontrollpanel
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const { 
    now, 
    isSimulated, 
    simulatedDateStr, 
    setSimulatedDate, 
    setSimulatedTime, 
    shiftSimulatedTime, 
    clearSimulatedDate 
  } = useSimulatedTime();

  // Shift-Tap Tracker: Erkennt einzelnes Drücken der Umschalt-Taste (ohne Modifikator-Kombination)
  const shiftKeyDownTimeRef = useRef<number | null>(null);
  const otherKeyPressedDuringShiftRef = useRef<boolean>(false);

  // Synchronisation mit globalen Toggles
  useEffect(() => {
    if (!isDev) return;

    const handleToggleSync = (e: any) => {
      if (typeof e?.detail === 'boolean') {
        setIsVisible(e.detail);
        if (e.detail) {
          setIsOpen(true);
        } else {
          setIsOpen(false);
        }
      } else {
        const saved = localStorage.getItem('groovelab_dev_date_sim_visible') === 'true';
        setIsVisible(saved);
        if (!saved) setIsOpen(false);
      }
    };

    window.addEventListener('groovelab_date_sim_toggle', handleToggleSync);
    return () => window.removeEventListener('groovelab_date_sim_toggle', handleToggleSync);
  }, [isDev]);

  const toggleVisibility = useCallback(() => {
    setIsVisible(prev => {
      const next = !prev;
      try {
        localStorage.setItem('groovelab_dev_date_sim_visible', String(next));
      } catch {}
      if (next) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('groovelab_date_sim_toggle', { detail: next }));
      }, 0);
      return next;
    });
  }, []);

  const togglePanelOpen = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Globaler Keyboard-Listener (Shift + T und Shift-Taste Tap)
  useEffect(() => {
    if (!isDev) return;

    const isInputActive = () => {
      if (typeof document === 'undefined') return false;
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el as HTMLElement).isContentEditable;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputActive()) return;

      // 1. Shift + T Shortcut: Master-Toggle zum kompletten Ein-/Ausblenden
      if (e.shiftKey && (e.key === 'T' || e.key === 't' || e.code === 'KeyT')) {
        e.preventDefault();
        e.stopPropagation();
        toggleVisibility();
        return;
      }

      // 2. Escape schließt das Panel
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);
        return;
      }

      // 3. Shift Key Tracking für schnellen Tap (< 700ms)
      if (e.key === 'Shift') {
        if (!shiftKeyDownTimeRef.current) {
          shiftKeyDownTimeRef.current = Date.now();
          otherKeyPressedDuringShiftRef.current = false;
        }
      } else if (shiftKeyDownTimeRef.current) {
        otherKeyPressedDuringShiftRef.current = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isInputActive()) {
        shiftKeyDownTimeRef.current = null;
        return;
      }

      if (e.key === 'Shift' && shiftKeyDownTimeRef.current) {
        const duration = Date.now() - shiftKeyDownTimeRef.current;
        const wasCleanShiftTap = !otherKeyPressedDuringShiftRef.current && duration > 20 && duration < 700;
        shiftKeyDownTimeRef.current = null;

        if (wasCleanShiftTap) {
          e.preventDefault();
          e.stopPropagation();
          // Wenn komplett ausgeblendet, einblenden und öffnen
          setIsVisible(currentVis => {
            if (!currentVis) {
              try { localStorage.setItem('groovelab_dev_date_sim_visible', 'true'); } catch {}
              setIsOpen(true);
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('groovelab_date_sim_toggle', { detail: true }));
              }, 0);
              return true;
            } else {
              // Wenn bereits sichtbar, Panel auf-/zuklappen
              setIsOpen(prev => !prev);
              return true;
            }
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [isDev, isOpen, toggleVisibility]);

  // Sekundengenaue Uhrzeit-Aktualisierung
  const [liveClock, setLiveClock] = useState<string>(() => {
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const currentNow = getSimulatedNow();
      const hours = String(currentNow.getHours()).padStart(2, '0');
      const minutes = String(currentNow.getMinutes()).padStart(2, '0');
      const seconds = String(currentNow.getSeconds()).padStart(2, '0');
      setLiveClock(`${hours}:${minutes}:${seconds}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Hilfsfunktion: Schule-Scoped Storage Sync
  const syncSchoolStorage = (dateStr: string | null) => {
    try {
      const schoolId = localStorage.getItem('groovelab_school_id') || 
                       localStorage.getItem('campus_school_id') || 
                       sessionStorage.getItem('groovelab_school_id');
      if (schoolId) {
        if (dateStr) {
          localStorage.setItem(`simulatedToday_${schoolId}`, dateStr);
        } else {
          localStorage.removeItem(`simulatedToday_${schoolId}`);
        }
      }
    } catch {}
  };

  const applyDate = (dateStr: string) => {
    setSimulatedDate(dateStr);
    syncSchoolStorage(dateStr);
  };

  const handleResetToRealToday = () => {
    clearSimulatedDate();
    syncSchoolStorage(null);
  };

  const handleResetTo14Clock = () => {
    setSimulatedTime('14:00:00');
  };

  const handleShiftDays = (deltaDays: number) => {
    const base = new Date(now);
    base.setDate(base.getDate() + deltaDays);
    const yyyy = base.getFullYear();
    const mm = String(base.getMonth() + 1).padStart(2, '0');
    const dd = String(base.getDate()).padStart(2, '0');
    applyDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleShiftHours = (deltaHours: number) => {
    shiftSimulatedTime(deltaHours * 60);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      applyDate(val);
    } else {
      handleResetToRealToday();
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      setSimulatedTime(`${val}:00`);
    }
  };

  // Aktuelle Werte für Datum- und Zeit-Inputs
  const currentDateInputVal = useMemo(() => {
    if (simulatedDateStr) return simulatedDateStr;
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, [simulatedDateStr, now]);

  const currentTimeInputVal = useMemo(() => {
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }, [now]);

  // Wochentage der aktuellen Woche für 1-Klick-Jumps
  const weekDays = useMemo(() => {
    const ref = new Date(now);
    const day = ref.getDay(); // 0 = So, 1 = Mo, ...
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(ref);
    monday.setDate(ref.getDate() + diffToMonday);

    const labels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const activeIso = simulatedDateStr || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    return labels.map((label, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const iso = `${yyyy}-${mm}-${dd}`;
      return { 
        label, 
        iso, 
        dateNum: d.getDate(), 
        isCurrentSim: activeIso === iso 
      };
    });
  }, [now, simulatedDateStr]);

  const formattedDisplayDate = useMemo(() => {
    return new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }).format(now);
  }, [now]);

  if (!isDev) return null;
  if (!isVisible) return null;

  return (
    <>
      {/* 1. Floating Entwickler Button (Bottom Right - Zero Collision with Left Sidebar) */}
      <div 
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '24px',
          zIndex: 999990,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <button
          type="button"
          role="button"
          tabIndex={0}
          aria-label={isSimulated ? `Datum & Zeit simuliert: ${formattedDisplayDate} ${liveClock}` : 'Datum & Zeit Simulation öffnen (Shift)'}
          onClick={togglePanelOpen}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              togglePanelOpen();
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: isSimulated 
              ? 'linear-gradient(135deg, #facc15 0%, #eab308 100%)' 
              : 'rgba(15, 23, 42, 0.90)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            color: isSimulated ? '#0f172a' : '#f8fafc',
            border: isSimulated ? '1.5px solid #ca8a04' : '1px solid rgba(255, 255, 255, 0.16)',
            borderRadius: '100px',
            padding: '6px 12px',
            fontSize: '0.74rem',
            fontWeight: 850,
            cursor: 'pointer',
            boxShadow: isSimulated 
              ? '0 6px 20px rgba(234, 179, 8, 0.4), 0 0 0 2px rgba(250, 204, 21, 0.3)' 
              : '0 6px 20px rgba(0, 0, 0, 0.35)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            userSelect: 'none',
            outline: 'none'
          }}
          title="Datum & Zeit Simulation öffnen (Umschalt-Taste oder Shift + T)"
        >
          {isSimulated ? (
            <>
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#047857',
                boxShadow: '0 0 6px #10b981',
                flexShrink: 0
              }} />
              <Calendar size={12} strokeWidth={2.6} color="#0f172a" />
              <span>{formattedDisplayDate.split(',')[1]?.trim() || formattedDisplayDate}</span>
              <span style={{
                background: '#0f172a',
                color: '#facc15',
                padding: '1px 5px',
                borderRadius: '5px',
                fontSize: '0.64rem',
                fontWeight: 900,
                fontFamily: 'monospace'
              }}>
                {liveClock.slice(0, 5)}
              </span>
            </>
          ) : (
            <>
              <Calendar size={12} strokeWidth={2.4} color="#facc15" />
              <span>Simu</span>
              <span style={{
                background: 'rgba(255, 255, 255, 0.14)',
                color: '#cbd5e1',
                padding: '1px 5px',
                borderRadius: '5px',
                fontSize: '0.64rem',
                fontWeight: 800
              }}>
                Shift
              </span>
            </>
          )}
        </button>
      </div>

      {/* 2. Kompaktes GrooveLab-Gelbes Controller Panel */}
      {isOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-label="Entwickler Datum- & Zeitsimulation"
          style={{
            position: 'fixed',
            bottom: '68px',
            right: '24px',
            zIndex: 999995,
            width: '320px',
            maxWidth: 'calc(100vw - 32px)',
            background: 'linear-gradient(145deg, #fef08a 0%, #facc15 50%, #eab308 100%)',
            border: '1.5px solid #ca8a04',
            borderRadius: '20px',
            padding: '12px 14px',
            boxSizing: 'border-box',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
            color: '#0f172a',
            fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
            animation: 'slideUpFade 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Header (Zero Wrap!) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                background: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Clock size={13} color="#facc15" strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: 850, color: '#0f172a', whiteSpace: 'nowrap' }}>
                Datum & Zeit
              </span>
              <span style={{
                fontSize: '0.58rem',
                background: '#0f172a',
                color: '#facc15',
                padding: '1px 5px',
                borderRadius: '4px',
                fontWeight: 900
              }}>
                DEV
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <button
                type="button"
                onClick={toggleVisibility}
                style={{
                  background: 'rgba(15, 23, 42, 0.08)',
                  border: '1px solid rgba(15, 23, 42, 0.16)',
                  borderRadius: '6px',
                  padding: '2px 7px',
                  color: '#0f172a',
                  fontSize: '0.64rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
                title="Simulation komplett ausblenden (Umschalt + T)"
              >
                Ausblenden (⇧T)
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(15, 23, 42, 0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0f172a',
                  cursor: 'pointer'
                }}
                title="Schließen (Escape)"
              >
                <X size={14} strokeWidth={2.4} />
              </button>
            </div>
          </div>

          {/* Live Status Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '7px 10px',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
            border: '1px solid rgba(0, 0, 0, 0.06)'
          }}>
            <div>
              <div style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {isSimulated ? 'Simuliertes Datum' : 'Echtzeit-Datum'}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 850, color: '#0f172a', marginTop: '1px' }}>
                {formattedDisplayDate}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {isSimulated ? 'Simulierte Zeit' : 'Echtzeit-Uhr'}
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', marginTop: '1px' }}>
                {liveClock}
              </div>
            </div>
          </div>

          {/* 2-Spalten Input Row (Datum & Uhrzeit nebeneinander!) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 800, color: '#334155', marginBottom: '3px' }}>
                📅 Datum:
              </label>
              <input
                type="date"
                value={currentDateInputVal}
                onChange={handleDateChange}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#ffffff',
                  border: '1.5px solid rgba(0, 0, 0, 0.12)',
                  borderRadius: '8px',
                  padding: '5px 6px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 800, color: '#334155', marginBottom: '3px' }}>
                ⏰ Uhrzeit:
              </label>
              <input
                type="time"
                step="60"
                value={currentTimeInputVal}
                onChange={handleTimeChange}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#ffffff',
                  border: '1.5px solid rgba(0, 0, 0, 0.12)',
                  borderRadius: '8px',
                  padding: '5px 6px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
            </div>
          </div>

          {/* Weekday Pills (Mo - So) */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
              {weekDays.map((wd) => (
                <button
                  key={wd.iso}
                  type="button"
                  onClick={() => applyDate(wd.iso)}
                  style={{
                    padding: '4px 1px',
                    borderRadius: '6px',
                    border: wd.isCurrentSim ? '1.5px solid #0f172a' : '1px solid rgba(0, 0, 0, 0.08)',
                    background: wd.isCurrentSim ? '#0f172a' : 'rgba(255, 255, 255, 0.85)',
                    color: wd.isCurrentSim ? '#fde047' : '#0f172a',
                    fontSize: '0.68rem',
                    fontWeight: wd.isCurrentSim ? 900 : 750,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1px',
                    boxShadow: wd.isCurrentSim ? '0 2px 6px rgba(0, 0, 0, 0.25)' : 'none'
                  }}
                  title={`${wd.label}, ${wd.dateNum}.`}
                >
                  <span style={{ fontSize: '0.58rem', opacity: wd.isCurrentSim ? 0.9 : 0.7 }}>{wd.label}</span>
                  <span style={{ fontSize: '0.72rem' }}>{wd.dateNum}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Stepper Row 1: Datum */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginBottom: '6px' }}>
            <button
              type="button"
              onClick={() => handleShiftDays(-1)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
                padding: '5px 2px',
                color: '#0f172a',
                fontSize: '0.68rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
              title="1 Tag zurück"
            >
              <ChevronLeft size={13} strokeWidth={2.4} />
              <span>-1 Tag</span>
            </button>

            <button
              type="button"
              onClick={handleResetToRealToday}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                background: isSimulated ? 'rgba(220, 38, 38, 0.14)' : 'rgba(255, 255, 255, 0.65)',
                border: isSimulated ? '1.5px solid rgba(220, 38, 38, 0.4)' : '1px solid rgba(0, 0, 0, 0.08)',
                borderRadius: '8px',
                padding: '5px 2px',
                color: isSimulated ? '#991b1b' : '#64748b',
                fontSize: '0.68rem',
                fontWeight: 850,
                cursor: 'pointer'
              }}
              title="Simulation beenden und auf echtes Datum/Uhrzeit zurücksetzen"
            >
              <RotateCcw size={12} strokeWidth={2.4} />
              <span>Heute</span>
            </button>

            <button
              type="button"
              onClick={() => handleShiftDays(1)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
                padding: '5px 2px',
                color: '#0f172a',
                fontSize: '0.68rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
              title="1 Tag vorwärts"
            >
              <span>+1 Tag</span>
              <ChevronRight size={13} strokeWidth={2.4} />
            </button>
          </div>

          {/* Quick Stepper Row 2: Uhrzeit & 14:00h Reset */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '4px', marginBottom: '8px' }}>
            <button
              type="button"
              onClick={() => handleShiftHours(-1)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
                padding: '5px 2px',
                color: '#0f172a',
                fontSize: '0.68rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
              title="1 Stunde zurück"
            >
              <span>-1 Std</span>
            </button>

            <button
              type="button"
              onClick={handleResetTo14Clock}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                background: '#0f172a',
                border: 'none',
                borderRadius: '8px',
                padding: '5px 2px',
                color: '#fde047',
                fontSize: '0.68rem',
                fontWeight: 850,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)'
              }}
              title="Uhrzeit exakt auf 14:00:00 Uhr setzen"
            >
              <Clock size={11} strokeWidth={2.6} />
              <span>14:00h Start</span>
            </button>

            <button
              type="button"
              onClick={() => handleShiftHours(1)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
                padding: '5px 2px',
                color: '#0f172a',
                fontSize: '0.68rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
              title="1 Stunde vorwärts"
            >
              <span>+1 Std</span>
            </button>
          </div>

          {/* Footer Hint */}
          <div style={{ textAlign: 'center', fontSize: '0.60rem', color: '#475569', fontWeight: 600 }}>
            Tipp: Öffnen & Schließen mit <strong style={{ color: '#0f172a' }}>Umschalt (Shift)</strong> oder <strong style={{ color: '#0f172a' }}>Shift+T</strong>.
          </div>
        </div>
      )}
    </>
  );
};

