import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export interface ParentConsentSettingsViewProps {
  studentUser: any;
  studentId: string;
}

export const ParentConsentSettingsView: React.FC<ParentConsentSettingsViewProps> = ({
  studentUser,
  studentId,
}) => {
  const [showDeletionModal, setShowDeletionModal] = useState<boolean>(false);
  const [deletionRequested, setDeletionRequested] = useState<boolean>(false);

  const handleRequestGdprDeletion = async () => {
    try {
      await supabase.from('gdpr_deletion_requests').insert({
        student_id: studentId,
        school_id: studentUser?.school_id || studentId,
        requested_by: studentId,
        scope: 'media_and_profile',
        status: 'pending'
      });
      setDeletionRequested(true);
      setShowDeletionModal(false);
    } catch (e) {
      alert('Antrag konnte nicht übermittelt werden. Bitte wende dich an das Sekretariat.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Zero-Photo Privacy-by-Design Certificate Card */}
      <div style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
        borderRadius: '24px',
        padding: '24px',
        border: '1.5px solid #86efac',
        boxShadow: '0 8px 24px -4px rgba(22, 163, 74, 0.12)',
        textAlign: 'left',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#16a34a',
            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.15)',
            flexShrink: 0
          }}>
            <ShieldCheck size={30} strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.01em' }}>
                Zero-Photo &amp; Privacy-by-Design Garantie
              </h3>
              <span style={{
                background: '#16a34a',
                color: '#ffffff',
                fontSize: '0.68rem',
                fontWeight: 850,
                padding: '3px 9px',
                borderRadius: '999px',
                letterSpacing: '0.02em',
                textTransform: 'uppercase'
              }}>
                100% Biometriefrei
              </span>
            </div>

            <p style={{ margin: '8px 0 0 0', fontSize: '0.82rem', color: '#1e293b', fontWeight: 600, lineHeight: 1.5 }}>
              <strong>Höchster Schutz für dein Kind:</strong> Campus-Groovelab speichert, verarbeitet und hostet ausnahmslos <strong>keine biometrischen Profilfotos</strong> oder Gesichtsaufnahmen von Schülern. 
            </p>

            <div style={{
              marginTop: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px'
            }}>
              <div style={{
                background: '#ffffff',
                padding: '12px 14px',
                borderRadius: '14px',
                border: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Check size={18} color="#16a34a" strokeWidth={3} />
                <span style={{ fontSize: '0.76rem', fontWeight: 750, color: '#0f172a' }}>
                  Ausschließliche Musiker- &amp; Instrumenten-Avatare
                </span>
              </div>

              <div style={{
                background: '#ffffff',
                padding: '12px 14px',
                borderRadius: '14px',
                border: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Check size={18} color="#16a34a" strokeWidth={3} />
                <span style={{ fontSize: '0.76rem', fontWeight: 750, color: '#0f172a' }}>
                  Schutz vor Deepfakes, Cyber-Mobbing &amp; Tracking
                </span>
              </div>

              <div style={{
                background: '#ffffff',
                padding: '12px 14px',
                borderRadius: '14px',
                border: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Check size={18} color="#16a34a" strokeWidth={3} />
                <span style={{ fontSize: '0.76rem', fontWeight: 750, color: '#0f172a' }}>
                  Keine Weitergabe an Social Media oder Werbenetzwerke
                </span>
              </div>

              <div style={{
                background: '#ffffff',
                padding: '12px 14px',
                borderRadius: '14px',
                border: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Check size={18} color="#16a34a" strokeWidth={3} />
                <span style={{ fontSize: '0.76rem', fontWeight: 750, color: '#0f172a' }}>
                  100% BSI TR-03116 &amp; Art. 25 DSGVO konform
                </span>
              </div>
            </div>

            <p style={{ margin: '14px 0 0 0', fontSize: '0.74rem', color: '#64748b', lineHeight: 1.45 }}>
              Aufgrund dieser strengen Sicherheitsarchitektur sind keine gesonderten Foto- oder Social-Media-Einwilligungen erforderlich. Dein Kind genießt maximale digitale Privatsphäre.
            </p>
          </div>
        </div>
      </div>

      {/* Art. 17 DSGVO Löschantrag */}
      <div style={{
        background: '#f8fafc',
        border: '1.5px dashed #cbd5e1',
        borderRadius: '18px',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} color="#94a3b8" />
          <h4 style={{ margin: 0, fontSize: '0.86rem', fontWeight: 850, color: '#334155' }}>
            Recht auf Vergessenwerden (Art. 17 DSGVO)
          </h4>
        </div>
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', lineHeight: 1.45 }}>
          Du hast das Recht, alle nicht gesetzlich aufbewahrungspflichtigen Daten (Audios, Memos, Übestatistiken) löschen zu lassen. Gesetzliche Buchungsbelege bleiben gemäß § 147 AO für 10 Jahre revisionssicher archiviert.
        </p>

        {deletionRequested ? (
          <div style={{
            background: '#ecfdf5',
            color: '#166534',
            padding: '8px 12px',
            borderRadius: '10px',
            fontSize: '0.76rem',
            fontWeight: 750
          }}>
            ✓ Dein Löschantrag wurde erfasst und wird vom Sekretariat fristgerecht bearbeitet.
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDeletionModal(true)}
            style={{
              alignSelf: 'flex-start',
              background: '#ffffff',
              border: '1.5px solid #fecaca',
              color: '#dc2626',
              borderRadius: '10px',
              padding: '8px 14px',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              marginTop: '4px'
            }}
            className="hover-scale"
          >
            Löschantrag nach Art. 17 DSGVO stellen
          </button>
        )}
      </div>

      {/* Confirmation Modal */}
      {showDeletionModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(6px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '26px',
            maxWidth: '440px',
            width: '100%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
              Datenlöschung nach Art. 17 DSGVO beantragen?
            </h3>
            <p style={{ margin: 0, fontSize: '0.80rem', color: '#475569', lineHeight: 1.5 }}>
              Dieser Antrag veranlasst die dauerhafte Löschung aller Übungsaufnahmen, Chat-Verläufe und Sticker-Fortschritte deines Kindes. Dieser Vorgang kann <strong>nicht rückgängig</strong> gemacht werden.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setShowDeletionModal(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleRequestGdprDeletion}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 850,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Antrag verbindlich absenden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
