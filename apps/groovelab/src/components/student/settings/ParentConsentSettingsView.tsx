import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, Check, Trash2, X, Lock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export interface ParentConsentSettingsViewProps {
  studentUser: {
    school_id?: string;
    [key: string]: unknown;
  } | null;
  studentId: string;
}

export const ParentConsentSettingsView: React.FC<ParentConsentSettingsViewProps> = ({
  studentUser,
  studentId,
}) => {
  const [showDeletionModal, setShowDeletionModal] = useState<boolean>(false);
  const [showAudioPurgeModal, setShowAudioPurgeModal] = useState<boolean>(false);
  const [deletionRequested, setDeletionRequested] = useState<boolean>(false);
  const [isPurgingAudio, setIsPurgingAudio] = useState<boolean>(false);
  const [audioPurgeSuccess, setAudioPurgeSuccess] = useState<string | null>(null);
  const [audioPurgeError, setAudioPurgeError] = useState<string | null>(null);
  const [deletionError, setDeletionError] = useState<string | null>(null);

  const handleExecuteAudioPurge = async () => {
    try {
      setIsPurgingAudio(true);
      setAudioPurgeError(null);
      const { data, error } = await supabase.rpc('purge_student_recordings_by_parent', {
        p_student_id: studentId
      });
      if (error) throw error;
      setAudioPurgeSuccess(data?.message || 'Alle Übe-Aufnahmen wurden unverzüglich und dauerhaft von den Servern gelöscht.');
      setShowAudioPurgeModal(false);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setAudioPurgeError('Fehler beim Löschen: ' + (err?.message || String(e)));
    } finally {
      setIsPurgingAudio(false);
    }
  };

  const handleRequestGdprDeletion = async () => {
    try {
      setDeletionError(null);
      const { error } = await supabase.from('gdpr_deletion_requests').insert({
        student_id: studentId,
        school_id: studentUser?.school_id || studentId,
        requested_by: studentId,
        scope: 'media_and_profile',
        status: 'pending'
      });
      if (error) throw error;
      setDeletionRequested(true);
      setShowDeletionModal(false);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setDeletionError('Antrag konnte nicht übermittelt werden: ' + (err?.message || 'Bitte wende dich an das Schulsekretariat.'));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 🏛️ 1. Zero-Photo & Privacy-by-Design Sicherheits-Zertifikat */}
      <div style={{
        background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
        borderRadius: '24px',
        padding: '24px',
        border: '1.5px solid #10b981',
        boxShadow: 'none',
        textAlign: 'left',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: 'none',
            flexShrink: 0
          }}>
            <ShieldCheck size={32} strokeWidth={2.4} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '1.20rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.01em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Zero-Photo &amp; Privacy-by-Design Garantie
              </h3>
              <span style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontSize: '0.68rem',
                fontWeight: 850,
                padding: '4px 10px',
                borderRadius: '999px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                boxShadow: 'none'
              }}>
                100% BIOMETRIEFREI
              </span>
            </div>

            <p style={{ margin: '10px 0 0 0', fontSize: '0.86rem', color: '#1e293b', fontWeight: 600, lineHeight: 1.55 }}>
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
                borderRadius: '16px',
                border: '1px solid #10b981',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <Check size={18} color="#10b981" strokeWidth={3} />
                <span style={{ fontSize: '0.78rem', fontWeight: 750, color: '#0f172a' }}>
                  Ausschließliche Musiker- &amp; Instrumenten-Avatare
                </span>
              </div>

              <div style={{
                background: '#ffffff',
                padding: '12px 14px',
                borderRadius: '16px',
                border: '1px solid #10b981',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <Check size={18} color="#10b981" strokeWidth={3} />
                <span style={{ fontSize: '0.78rem', fontWeight: 750, color: '#0f172a' }}>
                  Schutz vor Deepfakes, Cyber-Mobbing &amp; Tracking
                </span>
              </div>

              <div style={{
                background: '#ffffff',
                padding: '12px 14px',
                borderRadius: '16px',
                border: '1px solid #10b981',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <Check size={18} color="#10b981" strokeWidth={3} />
                <span style={{ fontSize: '0.78rem', fontWeight: 750, color: '#0f172a' }}>
                  Keine Weitergabe an Social Media oder Werbenetzwerke
                </span>
              </div>

              <div style={{
                background: '#ffffff',
                padding: '12px 14px',
                borderRadius: '16px',
                border: '1px solid #10b981',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <Check size={18} color="#10b981" strokeWidth={3} />
                <span style={{ fontSize: '0.78rem', fontWeight: 750, color: '#0f172a' }}>
                  100% BSI TR-03116 &amp; Art. 25 DSGVO konform
                </span>
              </div>
            </div>

            <p style={{ margin: '14px 0 0 0', fontSize: '0.80rem', color: '#334155', fontWeight: 550, lineHeight: 1.55 }}>
              Aufgrund dieser strengen Sicherheitsarchitektur sind keine gesonderten Foto- oder Social-Media-Einwilligungen erforderlich. Dein Kind genießt maximale digitale Privatsphäre und verlässlichen KUG-Bildnisschutz.
            </p>
          </div>
        </div>
      </div>

      {/* 🛡️ 2. Danger Zone: Recht auf Vergessenwerden (Art. 17 DSGVO) */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '24px',
        padding: '22px',
        boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04)',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Header Sektion */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#dc2626'
            }}>
              <Trash2 size={20} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Recht auf Vergessenwerden (Art. 17 DSGVO)
              </h4>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                Autonome Eltern-Souveränität über Medien und Profildaten
              </p>
            </div>
          </div>
          <span style={{
            background: '#f8fafc',
            color: '#475569',
            border: '1px solid #cbd5e1',
            padding: '3px 10px',
            borderRadius: '999px',
            fontSize: '0.68rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.03em'
          }}>
            Art. 17 DSGVO
          </span>
        </div>

        {/* Global Feedback Banners */}
        {audioPurgeSuccess && (
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            border: 'none',
            color: '#ffffff',
            padding: '12px 16px',
            borderRadius: '14px',
            fontSize: '0.80rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: 'none'
          }}>
            <Check size={18} color="#ffffff" strokeWidth={2.5} />
            <span>{audioPurgeSuccess}</span>
          </div>
        )}

        {audioPurgeError && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '12px 16px',
            borderRadius: '14px',
            fontSize: '0.80rem',
            fontWeight: 750,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertTriangle size={18} color="#dc2626" />
            <span>{audioPurgeError}</span>
          </div>
        )}

        {deletionRequested && (
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            border: 'none',
            color: '#ffffff',
            padding: '12px 16px',
            borderRadius: '14px',
            fontSize: '0.80rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: 'none'
          }}>
            <Check size={18} color="#ffffff" strokeWidth={2.5} />
            <span>✓ Dein Löschantrag wurde erfasst und wird vom Sekretariat fristgerecht bearbeitet.</span>
          </div>
        )}

        {deletionError && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '12px 16px',
            borderRadius: '14px',
            fontSize: '0.80rem',
            fontWeight: 750,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertTriangle size={18} color="#dc2626" />
            <span>{deletionError}</span>
          </div>
        )}

        {/* 2-Klassen-Löscharchitektur Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '14px'
        }}>
          {/* Stufe 1: Autonome Audio-Sofortlöschung */}
          <div style={{
            background: '#f8fafc',
            border: '1.5px solid #f1f5f9',
            borderRadius: '18px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '14px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 850,
                  color: '#b91c1c',
                  background: '#fee2e2',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}>
                  Sofortig
                </span>
                <h5 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 850, color: '#0f172a' }}>
                  Eigene Übe-Audios löschen
                </h5>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569', lineHeight: 1.45, fontWeight: 550 }}>
                Löscht alle selbst eingespielten Audioaufnahmen und Sprachmemos unwiderruflich von den Servern. Schulkonto, Noten und Stundenplan bleiben unberührt.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAudioPurgeModal(true)}
              style={{
                padding: '10px 16px',
                borderRadius: '12px',
                border: '1.5px solid #fecaca',
                background: '#ffffff',
                color: '#b91c1c',
                fontSize: '0.80rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                touchAction: 'manipulation',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
              className="hover-scale"
            >
              <Trash2 size={15} />
              <span>Übe-Aufnahmen jetzt löschen</span>
            </button>
          </div>

          {/* Stufe 2: Formeller DSGVO-Löschantrag */}
          <div style={{
            background: '#f8fafc',
            border: '1.5px solid #f1f5f9',
            borderRadius: '18px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '14px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 850,
                  color: '#475569',
                  background: '#e2e8f0',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}>
                  Sekretariat
                </span>
                <h5 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 850, color: '#0f172a' }}>
                  Vollständigen Löschantrag stellen
                </h5>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569', lineHeight: 1.45, fontWeight: 550 }}>
                Beantragt die Löschung aller nicht gesetzlich aufbewahrungspflichtigen Daten. Revisionssichere Buchungsbelege bleiben gemäß 147 AO für 10 Jahre archiviert.
              </p>
            </div>

            <button
              type="button"
              disabled={deletionRequested}
              onClick={() => setShowDeletionModal(true)}
              style={{
                padding: '10px 16px',
                borderRadius: '12px',
                border: '1.5px solid #cbd5e1',
                background: deletionRequested ? '#f1f5f9' : '#ffffff',
                color: deletionRequested ? '#94a3b8' : '#334155',
                fontSize: '0.80rem',
                fontWeight: 800,
                cursor: deletionRequested ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                touchAction: 'manipulation',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
              className={deletionRequested ? "" : "hover-scale"}
            >
              <AlertTriangle size={15} />
              <span>{deletionRequested ? 'Antrag bereits eingereicht' : 'Löschantrag einreichen'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🛡️ In-App Modal 1: Bestätigung Audio-Sofortlöschung (Two-Step, Fail-Closed) */}
      {showAudioPurgeModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="audio-purge-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.70)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 99999
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPurgingAudio) {
              setShowAudioPurgeModal(false);
            }
          }}
        >
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '28px',
            maxWidth: '460px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1.5px solid #fecaca',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Trash2 size={24} />
              </div>
              <div>
                <h3 id="audio-purge-modal-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Übe-Aufnahmen löschen?
                </h3>
                <span style={{ fontSize: '0.74rem', color: '#dc2626', fontWeight: 750 }}>
                  Unwiderrufliche Server-Bereinigung (Art. 17 DSGVO)
                </span>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.82rem', color: '#334155', lineHeight: 1.55 }}>
              Möchtest du wirklich alle selbst erstellten Instrumental-Aufnahmen und Sprachmemos deines Kindes dauerhaft von den Plattform-Servern tilgen?
            </p>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#991b1b', fontWeight: 700 }}>
                <span>✕</span>
                <span>Wird unwiderruflich gelöscht: Alle Audio-Dateien &amp; Memos</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#166534', fontWeight: 700 }}>
                <span>✓</span>
                <span>Bleibt 100% erhalten: Schülerkonto, Noten, Stundenpläne &amp; Sticker</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button
                type="button"
                disabled={isPurgingAudio}
                onClick={() => setShowAudioPurgeModal(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: isPurgingAudio ? 'not-allowed' : 'pointer'
                }}
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={isPurgingAudio}
                onClick={handleExecuteAudioPurge}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 850,
                  fontSize: '0.82rem',
                  cursor: isPurgingAudio ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: 'none'
                }}
              >
                <Trash2 size={15} />
                <span>{isPurgingAudio ? 'Wird physisch gelöscht...' : 'Jetzt unwiderruflich löschen'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🛡️ In-App Modal 2: Bestätigung DSGVO-Löschantrag (Art. 17 DSGVO) */}
      {showDeletionModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gdpr-deletion-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.70)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 99999
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeletionModal(false);
            }
          }}
        >
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '28px',
            maxWidth: '460px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1.5px solid #e2e8f0',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 id="gdpr-deletion-modal-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Löschantrag nach Art. 17 DSGVO
                </h3>
                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 750 }}>
                  Offizielle Übermittlung an das Schulsekretariat
                </span>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.82rem', color: '#334155', lineHeight: 1.55 }}>
              Dieser Antrag veranlasst die dauerhafte Löschung aller Übungsaufnahmen, Chat-Verläufe und Sticker-Fortschritte deines Kindes. Dieser Vorgang kann <strong>nicht rückgängig</strong> gemacht werden.
            </p>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '12px 14px',
              fontSize: '0.76rem',
              color: '#64748b',
              lineHeight: 1.45
            }}>
              Hinweis: Gesetzliche Buchungsbelege und Vertragsunterlagen bleiben gemäß steuerlicher Aufbewahrungspflicht (147 AO) für 10 Jahre revisionssicher archiviert.
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
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
                  cursor: 'pointer',
                  boxShadow: 'none'
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
