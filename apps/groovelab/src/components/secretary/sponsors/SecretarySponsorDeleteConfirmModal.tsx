/**
 * 🏛️ Campus-Groovelab Secretary Sponsor Delete Confirm Modal
 * 
 * 0.1% Monolith Goldstandard / Autarkic Feature Satellite
 * Bounded Context: Administration & Governance (Secretary Dashboard)
 * Standards: OWASP ASVS Level 3 / BFSG 2025 / WCAG 2.2 AA / Zero Color-Clash Doktrin
 * Feature: 2-stufige Sicherheitsabfrage mit Folgenaufklärung beim Entfernen eines Bildungspartners
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, Trash2, ChevronRight } from 'lucide-react';
import type { SchoolSponsorItem } from './SecretarySponsorsModal';

export interface SecretarySponsorDeleteConfirmModalProps {
  sponsor: SchoolSponsorItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (sponsorId: string) => void;
}

export const SecretarySponsorDeleteConfirmModal: React.FC<SecretarySponsorDeleteConfirmModalProps> = ({
  sponsor,
  isOpen,
  onClose,
  onConfirm
}) => {
  const [step, setStep] = useState<1 | 2>(1);

  // Schritt bei jedem Neuöffnen auf Stufe 1 zurücksetzen
  useEffect(() => {
    if (isOpen) {
      setStep(1);
    }
  }, [isOpen]);

  // Barrierefreie Tastatur-Steuerung (BFSG 2025 / WCAG 2.2 AA)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !sponsor) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-desc"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 1000005
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '22px',
          border: '1.5px solid #e2e8f0',
          padding: '24px 26px',
          width: '100%',
          maxWidth: '460px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {step === 1 ? (
          <>
            {/* SCHRITT 1: ERSTE NACHFRAGE - WARNUNG & AUSWIRKUNGEN */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <AlertCircle size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'inline-block',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: '#d97706',
                  background: '#fef3c7',
                  padding: '2px 8px',
                  borderRadius: '100px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '4px'
                }}>
                  Sicherheitsabfrage • Schritt 1 von 2
                </div>
                <h4 id="delete-dialog-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>
                  Bildungspartner entfernen?
                </h4>
              </div>
            </div>

            <div id="delete-dialog-desc" style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.82rem', color: '#334155' }}>
              <p style={{ margin: 0, lineHeight: 1.45 }}>
                Möchten Sie den Bildungspartner <strong style={{ color: '#0f172a' }}>„{sponsor.companyName}“</strong> wirklich aus der Schule entfernen?
              </p>

              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Direkte Auswirkungen bei Entfernung:
                </span>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.78rem', color: '#475569' }}>
                  <span style={{ color: '#ef4444', fontWeight: 900 }}>•</span>
                  <span>Sofortige Entfernung aus dem <strong>Begrüßungs-Banner</strong> der Schüler-PWA</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.78rem', color: '#475569' }}>
                  <span style={{ color: '#ef4444', fontWeight: 900 }}>•</span>
                  <span>Löschung von der <strong>digitalen Stiftertafel</strong> im Elternportal</span>
                </div>
                {sponsor.tier === 'haupt' && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.78rem', color: '#d97706' }}>
                    <span style={{ fontWeight: 900 }}>•</span>
                    <span>Der <strong>Branchenschutz</strong> für diese Sparte wird aufgehoben</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '9px 16px',
                  borderRadius: '11px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '11px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>Weiter zur Bestätigung</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* SCHRITT 2: ZWEITE NACHFRAGE - UNWIDERRUFLICHE BESTÄTIGUNG */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#fef2f2',
                border: '1px solid #fee2e2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Trash2 size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'inline-block',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: '#dc2626',
                  background: '#fee2e2',
                  padding: '2px 8px',
                  borderRadius: '100px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '4px'
                }}>
                  Sicherheitsabfrage • Letzter Schritt (2 von 2)
                </div>
                <h4 id="delete-dialog-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#991b1b', letterSpacing: '-0.01em' }}>
                  Unwiderruflich löschen?
                </h4>
              </div>
            </div>

            <div id="delete-dialog-desc" style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.82rem', color: '#334155' }}>
              <div style={{
                background: '#fef2f2',
                border: '1.5px solid #fecaca',
                borderRadius: '14px',
                padding: '14px',
                color: '#991b1b',
                fontSize: '0.82rem',
                lineHeight: 1.45
              }}>
                <strong>Sind Sie absolut sicher?</strong> Diese Aktion kann <strong>nicht rückgängig</strong> gemacht werden.
                <p style={{ margin: '8px 0 0 0', fontSize: '0.78rem', color: '#7f1d1d' }}>
                  Der Bildungspartner <strong style={{ textDecoration: 'underline' }}>{sponsor.companyName}</strong> wird dauerhaft gelöscht und aus allen Datenbanken und Schülertablets entfernt.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '11px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ← Zurück
              </button>
              <button
                type="button"
                onClick={() => onConfirm(sponsor.id)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '11px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 size={15} />
                <span>Ja, unwiderruflich löschen</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
