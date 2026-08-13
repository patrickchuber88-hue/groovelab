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
            fontWeight: 600,
            lineHeight: 1.5
          }}>
            Vertragspartner: <strong>{school?.name || 'Musikschule'}</strong> {school?.address ? `(${school.address}) ` : ''}(Auftraggeber) und <strong>Campus-Groovelab SaaS Operator</strong> (Patrick Huber, Karl-Fürstenberg-Str. 59, 79618 Rheinfelden) (Auftragnehmer).
          </div>

          <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginTop: '12px', color: '#0f172a' }}>
            1. Gegenstand, Art &amp; Zweck der Verarbeitung
          </h4>
          <p style={{ margin: '4px 0 12px 0' }}>
            Der Auftragnehmer erbringt für den Auftraggeber die Bereitstellung der SaaS-Schulmanagement- und Übungsplattform <strong>Campus-Groovelab</strong>. Die Verarbeitung erfolgt ausschließlich auf dokumentierte Weisung des Auftraggebers (Art. 28 Abs. 3 lit. a DSGVO).
          </p>

          <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginTop: '12px', color: '#0f172a' }}>
            2. Vertraulichkeit &amp; Serverstandort (Art. 28 Abs. 3 lit. b DSGVO)
          </h4>
          <p style={{ margin: '4px 0 12px 0' }}>
            Sämtliche personenbezogenen Daten werden zu 100% in ISO 27001-zertifizierten deutschen Rechenzentren der <strong>Hetzner Online GmbH (Falkenstein/DE) &amp; Supabase EU (Frankfurt/DE)</strong> verarbeitet. Das eingesetzte Personal ist zur Verschwiegenheit verpflichtet.
          </p>

          <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginTop: '12px', color: '#0f172a' }}>
            3. Technisch-Organisatorische Maßnahmen / TOMs (Art. 32 DSGVO)
          </h4>
          <p style={{ margin: '4px 0 12px 0' }}>
            Gewährleistung von TLS 1.3 &amp; AES-256 Verschlüsselung, clientseitiger Datenminimierung (Pseudonymisierung von Vornamen), strikter Row-Level Security (RLS) Mandantentrennung sowie schreibgeschützten WORM Audit-Logs in deutscher Ortszeit.
          </p>

          <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginTop: '12px', color: '#0f172a' }}>
            4. Unterauftragsverhältnisse (Art. 28 Abs. 2 DSGVO)
          </h4>
          <p style={{ margin: '4px 0 12px 0' }}>
            Der Auftraggeber stimmt der Einbindung der Unterauftragsverarbeiter Hetzner Online GmbH (Hosting Infrastruktur DE) und Supabase EU (Datenbank DE) zu.
          </p>

          <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginTop: '12px', color: '#0f172a' }}>
            5. Unterstützungspflichten &amp; Meldung von Datenschutzverletzungen
          </h4>
          <p style={{ margin: '4px 0 12px 0' }}>
            Der Auftragnehmer unterstützt den Auftraggeber bei Betroffenenrechten (Art. 15–22 DSGVO) sowie bei der Meldung von Datenschutzverletzungen (Art. 33 DSGVO).
          </p>

          <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginTop: '12px', color: '#0f172a' }}>
            6. Beendigung, Datenlöschung &amp; Kontrollrechte (Art. 17 &amp; 28 DSGVO)
          </h4>
          <p style={{ margin: '4px 0 12px 0' }}>
            Vollständige Löschung aller verarbeiteten Daten nach Vertragsende oder Aufhebung der Freischaltung. Der Auftraggeber erhält alle erforderlichen Nachweise und Audit-Rechte.
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
