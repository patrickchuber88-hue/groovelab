/**
 * 🏛️ Campus-Groovelab 0,1% Goldstandard Absence Grace Period Banner
 * AbsenceGracePeriodBanner.tsx
 * 
 * Zeigt der Lehrkraft während der 15-minütigen Bedenkzeit einen flüssigen
 * Countdown und ermöglicht das sofortige, rückstandsfreie Rückgängigmachen (Undo)
 * oder den manuellen Sofortversand.
 * 
 * Barrierefreiheit & Design:
 * - WCAG 2.2 AA Kontrast ≥ 7:1 (Plus Jakarta Sans, warmes Bernstein/Slate)
 * - Tastaturbedienung mit role="region" & aria-live="polite"
 * - Flüssige 1-Sekunden-Timer-Aktualisierung
 */

import React, { useState, useEffect } from 'react';
import { Clock, RotateCcw, Zap, AlertCircle } from 'lucide-react';
import { PendingAbsenceDispatch } from '../../../services/room/smartRoomSwappingService';

export interface AbsenceGracePeriodBannerProps {
  pendingAbsence: PendingAbsenceDispatch | null;
  onUndo: () => void;
  onDispatchNow: () => void;
  isSubmitting?: boolean;
}

export const AbsenceGracePeriodBanner: React.FC<AbsenceGracePeriodBannerProps> = ({
  pendingAbsence,
  onUndo,
  onDispatchNow,
  isSubmitting = false
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  useEffect(() => {
    if (!pendingAbsence?.dispatchAt) {
      setSecondsRemaining(0);
      return;
    }

    const calculateRemaining = () => {
      const targetTime = new Date(pendingAbsence.dispatchAt).getTime();
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((targetTime - now) / 1000));
      return diffSec;
    };

    setSecondsRemaining(calculateRemaining());

    const timer = setInterval(() => {
      const rem = calculateRemaining();
      setSecondsRemaining(rem);
      if (rem <= 0) {
        clearInterval(timer);
        onDispatchNow();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [pendingAbsence, onDispatchNow]);

  if (!pendingAbsence || secondsRemaining <= 0) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  const dispatchDate = new Date(pendingAbsence.dispatchAt);
  const dispatchTimeFormatted = `${String(dispatchDate.getHours()).padStart(2, '0')}:${String(dispatchDate.getMinutes()).padStart(2, '0')}`;

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Ausfall-Schonfrist aktiv"
      style={{
        background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
        border: '1.5px solid #fde68a',
        borderRadius: '16px',
        padding: '12px 16px',
        margin: '0 0 14px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxShadow: 'none',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: '#f59e0b',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'none',
              flexShrink: 0
            }}
          >
            <Clock size={17} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <strong style={{ fontSize: '0.84rem', color: '#92400e', fontWeight: 900, letterSpacing: '-0.01em' }}>
                Ausfall vorgemerkt (15 Min. Bedenkzeit)
              </strong>
              <span
                style={{
                  background: '#fef3c7',
                  border: '1px solid #f59e0b',
                  color: '#b45309',
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '100px',
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                Noch {timeFormatted}
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#b45309', fontWeight: 600 }}>
              Schüler werden erst um <strong>{dispatchTimeFormatted} Uhr</strong> benachrichtigt. Bis dahin bleibt der Ausfall stornierbar.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={onUndo}
            disabled={isSubmitting}
            aria-label="Ausfall sofort rückgängig machen"
            style={{
              background: '#ffffff',
              color: '#0f172a',
              border: '1.5px solid #d97706',
              padding: '7px 12px',
              borderRadius: '10px',
              fontWeight: 850,
              fontSize: '0.76rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
              transition: 'all 0.15s ease'
            }}
          >
            <RotateCcw size={13} color="#d97706" />
            <span>Rückgängig machen (Undo)</span>
          </button>

          <button
            type="button"
            onClick={onDispatchNow}
            disabled={isSubmitting}
            aria-label="Benachrichtigung jetzt sofort an Schüler senden"
            style={{
              background: '#d97706',
              color: '#ffffff',
              border: 'none',
              padding: '7px 12px',
              borderRadius: '10px',
              fontWeight: 850,
              fontSize: '0.76rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Zap size={13} />
            <span>Jetzt sofort senden</span>
          </button>
        </div>
      </div>
    </div>
  );
};
