import React from "react";
import { createPortal } from "react-dom";
import { Award, Moon, Smartphone } from "lucide-react";

export interface DigitalDetoxOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  detoxCompleted: boolean;
  setDetoxCompleted: (completed: boolean) => void;
  detoxMinutes: number;
  detoxSecondsLeft: number;
  isFaceDown: boolean;
  setIsDetoxActive: (active: boolean) => void;
  xpActive?: boolean;
}

export const DigitalDetoxOverlay: React.FC<DigitalDetoxOverlayProps> = ({
  isOpen,
  onClose,
  detoxCompleted,
  setDetoxCompleted,
  detoxMinutes,
  detoxSecondsLeft,
  isFaceDown,
  setIsDetoxActive,
  xpActive = true,
}) => {
  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
<div style={{
          position: 'fixed',
          inset: 0,
          background: '#000000', // AMOLED Black
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontFamily: '"Outfit", sans-serif',
          padding: '24px'
        }}>
          {isFaceDown ? (
            // Full AMOLED-Black with minimal reizarm layout
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '32px', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Moon size={24} color="#52525b" className="animate-pulse" />
              </div>
              <h1 style={{ fontSize: '4rem', fontWeight: 100, fontFamily: 'monospace', letterSpacing: '-0.02em', color: '#27272a', margin: 0 }}>
                {Math.floor(detoxSecondsLeft / 60)}:{String(detoxSecondsLeft % 60).padStart(2, '0')}
              </h1>
              <p style={{ color: '#27272a', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                Digital Detox Aktiv
              </p>
            </div>
          ) : (
            // Warning/Flat check mode when flipped face up
            <div style={{ 
              textAlign: 'center', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '28px', 
              alignItems: 'center', 
              maxWidth: '340px',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '30px',
              padding: '40px 30px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '24px', 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.2)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.05)'
              }}>
                <Smartphone size={38} color="#ef4444" className="animate-bounce" />
              </div>
              
              <div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f87171', letterSpacing: '-0.02em', margin: '0 0 8px 0' }}>
                  Handy umdrehen!
                </h2>
                <p style={{ color: '#a1a1aa', fontSize: '0.88rem', lineHeight: '1.5', fontWeight: 500, margin: 0 }}>
                  Der Timer ist eingefroren. Lege das Smartphone mit dem Display nach unten hin, um den Fokusmodus fortzusetzen.
                </p>
              </div>
              
              <div style={{ fontSize: '3.6rem', fontWeight: 800, color: 'white', fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.02em', margin: '10px 0', lineHeight: 1 }}>
                {Math.floor(detoxSecondsLeft / 60)}:{String(detoxSecondsLeft % 60).padStart(2, '0')}
              </div>

              <div style={{ width: '100%' }}>
                <button 
                  onClick={() => {
                    setIsDetoxActive(false);
                    onClose();
                  }}
                  style={{ 
                    width: '100%', 
                    padding: '16px', 
                    background: 'rgba(255, 255, 255, 0.1)', 
                    border: '1px solid rgba(255, 255, 255, 0.05)', 
                    color: 'white', 
                    borderRadius: '20px', 
                    fontSize: '0.9rem', 
                    fontWeight: 700, 
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  className="hover-scale"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {detoxCompleted && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: '#09090b',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              textAlign: 'center'
            }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#34a853', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <Award size={48} color="white" />
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white' }}>Fokus abgeschlossen!</h2>
              <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginTop: '8px', maxWidth: '280px' }}>
                {xpActive 
                  ? `Sehr gut! Du warst ${detoxMinutes} Minuten voll konzentriert. Dir wurden +10 XP auf deinen Avatar gebucht.`
                  : `Sehr gut! Du warst ${detoxMinutes} Minuten voll konzentriert. Dein Fokus war erfolgreich!`}
              </p>
              
              <button 
                onClick={() => {
                  onClose();
                  setDetoxCompleted(false);
                }}
                style={{ marginTop: '24px', background: '#34a853', color: 'white', border: 'none', padding: '14px 28px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer' }}
              >
                Zurück zum Dashboard
              </button>
            </div>
          )}
        </div>
  , document.body);
};
