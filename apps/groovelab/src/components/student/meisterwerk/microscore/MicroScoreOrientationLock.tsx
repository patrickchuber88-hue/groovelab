/**
 * 🏛️ Campus-Groovelab Micro-Score Studio (1–4 Takte)
 * MicroScoreOrientationLock.tsx
 * 
 * 2027 0,1% Goldstandard Apple-grade Orientation-Lock Overlay:
 * - Verhindert unbedienbare Notendarstellung im Smartphone-Hochformat
 * - Didaktische Aufforderung mit flüssiger CSS 3D-Rotationsanimation
 * - Notenpult-Modus mit Abbruch-Option (Zero-Trap Axiom)
 * - BFSG 2025 & WCAG 2.2 AA konform (Kontrast ≥ 7:1, role="alertdialog")
 */

import React from 'react';
import { X, RotateCw } from 'lucide-react';

export interface MicroScoreOrientationLockProps {
  isOpen: boolean;
  onCancel: () => void;
}

export const MicroScoreOrientationLock: React.FC<MicroScoreOrientationLockProps> = ({
  isOpen,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Bitte Smartphone ins Querformat drehen"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        background: 'rgba(15, 23, 42, 0.96)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        color: '#ffffff',
        textAlign: 'center',
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
    >
      <style>{`
        @keyframes phoneRotate3D {
          0% {
            transform: rotate(0deg) scale(1);
          }
          35% {
            transform: rotate(-90deg) scale(1.08);
          }
          70% {
            transform: rotate(-90deg) scale(1.08);
          }
          100% {
            transform: rotate(0deg) scale(1);
          }
        }
        @keyframes pulseGlowRing {
          0%, 100% {
            box-shadow: none;
          }
          50% {
            box-shadow: none;
          }
        }
      `}</style>

      {/* Abbrechen-Schaltfläche oben rechts */}
      <button
        type="button"
        onClick={onCancel}
        aria-label="Studio verlassen"
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(255, 255, 255, 0.12)',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          cursor: 'pointer',
          transition: 'background 0.15s ease'
        }}
      >
        <X size={20} strokeWidth={2.4} />
      </button>

      {/* Animiertes Device-Icon */}
      <div
        style={{
          width: '96px',
          height: '96px',
          borderRadius: '28px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(79, 70, 229, 0.4))',
          border: '1px solid rgba(165, 180, 252, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          animation: 'pulseGlowRing 2.4s infinite cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div
          style={{
            width: '44px',
            height: '68px',
            borderRadius: '10px',
            border: '3px solid #ffffff',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'phoneRotate3D 2.6s infinite cubic-bezier(0.16, 1, 0.3, 1)',
            transformOrigin: 'center center'
          }}
        >
          {/* Bildschirm-Balken */}
          <div
            style={{
              width: '26px',
              height: '46px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '4px'
            }}
          />
          {/* Home-Bar / Lautsprecher-Kerbe */}
          <div
            style={{
              position: 'absolute',
              top: '3px',
              width: '12px',
              height: '2px',
              borderRadius: '2px',
              background: '#ffffff'
            }}
          />
        </div>
      </div>

      {/* Didaktischer Text */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(99, 102, 241, 0.2)',
          border: '1px solid rgba(165, 180, 252, 0.35)',
          padding: '4px 14px',
          borderRadius: '99px',
          fontSize: '0.74rem',
          fontWeight: 800,
          color: '#a5b4fc',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: '12px'
        }}
      >
        <RotateCw size={13} strokeWidth={2.5} />
        <span>Campus Notenständer-Modus</span>
      </div>

      <h2
        style={{
          margin: '0 0 10px 0',
          fontSize: '1.45rem',
          fontWeight: 900,
          color: '#ffffff',
          letterSpacing: '-0.02em',
          maxWidth: '320px',
          lineHeight: 1.2
        }}
      >
        Bitte ins Querformat drehen
      </h2>

      <p
        style={{
          margin: '0 0 28px 0',
          fontSize: '0.86rem',
          color: '#cbd5e1',
          maxWidth: '300px',
          lineHeight: 1.45,
          fontWeight: 600
        }}
      >
        Für die optimale Notengröße und Taktübersicht: Lege dein Smartphone quer auf das Notenpult oder den Tisch.
      </p>

      {/* Fallback-Button zum Abbrechen */}
      <button
        type="button"
        onClick={onCancel}
        style={{
          border: '1px solid rgba(255, 255, 255, 0.2)',
          background: 'rgba(255, 255, 255, 0.08)',
          color: '#ffffff',
          borderRadius: '12px',
          padding: '10px 22px',
          fontSize: '0.82rem',
          fontWeight: 800,
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        Übung abbrechen
      </button>
    </div>
  );
};
