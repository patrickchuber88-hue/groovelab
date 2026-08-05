import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, Download, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AVVModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: any;
  onAVVSigned?: () => void;
}

export const AVVModal: React.FC<AVVModalProps> = ({ isOpen, onClose, school, onAVVSigned }) => {
  const [signeeName, setSigneeName] = useState(school?.avv_signee_name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signedSuccess, setSignedSuccess] = useState(Boolean(school?.avv_signed_at));

  if (!isOpen) return null;

  const handleSignAVV = async () => {
    if (!signeeName.trim() || !school?.id) return;

    try {
      setIsSubmitting(true);
      const signedAt = new Date().toISOString();
      
      const { error } = await supabase
        .from('schools')
        .update({
          avv_signed_at: signedAt,
          avv_signee_name: signeeName.trim()
        })
        .eq('id', school.id);

      if (error) throw error;

      setSignedSuccess(true);
      if (onAVVSigned) onAVVSigned();
    } catch (err) {
      console.error('Error signing AVV:', err);
      alert('Fehler beim Speichern der Unterzeichnung. Bitte versuchen Sie es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        borderRadius: '24px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #e2e8f0'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: '#ea4335',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Auftragsverarbeitungsvertrag (AVV)
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                gemäß Art. 28 DSGVO & Art. 9 CH-nDSG für Campus-Groovelab
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Modal schließen"
            style={{
              border: 'none',
              background: '#f1f5f9',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Legal Text Scroll Container */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1,
          fontSize: '0.82rem',
          lineHeight: 1.6,
          color: '#334155',
          background: '#ffffff'
        }}>
          <div style={{
            background: '#f1f5f9',
            padding: '12px 16px',
            borderRadius: '12px',
            marginBottom: '16px',
            fontSize: '0.78rem',
            fontWeight: 600
          }}>
            Vertragspartner: <strong>{school?.name || 'Musikschule'}</strong> (Auftraggeber) und <strong>Campus-Groovelab SaaS Operator</strong> (Auftragnehmer).
          </div>

          <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginTop: '12px', color: '#0f172a' }}>
            1. Gegenstand & Dauer der Vereinbarung
          </h4>
          <p style={{ margin: '4px 0 12px 0' }}>
            Der Auftragnehmer verarbeitet personenbezogene Daten im Auftrag des Auftraggebers im Rahmen der Nutzung der SaaS-Software Campus-Groovelab (Hausaufgabenheft, Schüler-Protokolle, Band-Verwaltung & Audio-Loopstation).
          </p>

          <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginTop: '12px', color: '#0f172a' }}>
            2. Pflichten des Auftragnehmers
          </h4>
          <ul style={{ margin: '4px 0 12px 0', paddingLeft: '20px' }}>
            <li>Verarbeitung ausschließlich auf dokumentierte Weisung des Auftraggebers.</li>
            <li>Gewährleistung technischer und organisatorischer Maßnahmen (TOM) nach Art. 32 DSGVO (Verschlüsselung, Mandantentrennung).</li>
            <li>Vollständige Löschung aller personenbezogenen Schülerspuren und Audiodateien nach Vertragsende oder Aufhebung der Freischaltung.</li>
          </ul>

          <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginTop: '12px', color: '#0f172a' }}>
            3. Unterauftragsverhältnisse & Drittländer
          </h4>
          <p style={{ margin: '4px 0 12px 0' }}>
            Daten werden ausschließlich in Rechenzentren innerhalb der Europäischen Union bzw. der Schweiz verarbeitet (Host: Hetzner / Supabase EU-West Frankfurt).
          </p>
        </div>

        {/* Signing Footer */}
        <div style={{
          padding: '20px 24px',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {signedSuccess || school?.avv_signed_at ? (
            <div style={{
              background: '#f0fdf4',
              border: '1.5px solid #bbf7d0',
              padding: '14px',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={24} color="#166534" />
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#166534' }}>
                    AVV erfolgreich digital unterzeichnet
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#15803d' }}>
                    Gezeichnet durch: {school?.avv_signee_name || signeeName} am {new Date(school?.avv_signed_at || Date.now()).toLocaleDateString('de-DE')}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: '#166534',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px 16px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Schließen
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155' }}>
                  Name des/der Vertretungsberechtigten (z. B. Schulleitung):
                </label>
                <input
                  type="text"
                  placeholder="z. B. Dr. Maria Musterfrau (Schulleitung)"
                  value={signeeName}
                  onChange={(e) => setSigneeName(e.target.value)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.84rem',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleSignAVV}
                disabled={!signeeName.trim() || isSubmitting}
                aria-label="Auftragsverarbeitungsvertrag digital unterzeichnen"
                style={{
                  width: '100%',
                  background: signeeName.trim() ? '#ea4335' : '#cbd5e1',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '12px',
                  fontSize: '0.86rem',
                  fontWeight: 900,
                  cursor: signeeName.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: signeeName.trim() ? '0 4px 14px rgba(234, 67, 53, 0.3)' : 'none',
                  transition: 'all 0.15s'
                }}
                className="focus-ring"
              >
                <ShieldCheck size={18} />
                {isSubmitting ? 'Unterzeichnung wird verarbeitet...' : 'Auftragsverarbeitungsvertrag (AVV) rechtsverbindlich unterzeichnen'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
