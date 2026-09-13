import React, { useState, useEffect } from 'react';
import { Camera, Users, Award, ShieldCheck, Mail, AlertTriangle, Check, RotateCcw } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export interface ParentConsentSettingsViewProps {
  studentUser: any;
  studentId: string;
}

export const ParentConsentSettingsView: React.FC<ParentConsentSettingsViewProps> = ({
  studentUser,
  studentId,
}) => {
  const [consents, setConsents] = useState<Record<string, boolean>>({
    photo_internal: true,
    photo_social_media: false,
    concert_program: true,
    newsletter: false,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showDeletionModal, setShowDeletionModal] = useState<boolean>(false);
  const [deletionRequested, setDeletionRequested] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const loadConsents = async () => {
      try {
        const { data, error } = await supabase
          .from('student_consents')
          .select('consent_type, granted')
          .eq('student_id', studentId);

        if (!error && data && data.length > 0 && isMounted) {
          const loaded: Record<string, boolean> = { ...consents };
          data.forEach((row: any) => {
            loaded[row.consent_type] = Boolean(row.granted);
          });
          setConsents(loaded);
        }
      } catch (e) {
        console.warn('Could not load consents:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadConsents();
    return () => { isMounted = false; };
  }, [studentId]);

  const handleToggleConsent = async (type: string) => {
    if (savingKey) return;
    const nextVal = !consents[type];
    setSavingKey(type);
    setSuccessMsg(null);

    // Optimistic UI
    setConsents(prev => ({ ...prev, [type]: nextVal }));

    try {
      const { error } = await supabase.rpc('save_student_consent', {
        p_student_id: studentId,
        p_consent_type: type,
        p_granted: nextVal,
      });

      if (error) {
        // Rollback on error
        setConsents(prev => ({ ...prev, [type]: !nextVal }));
        alert('Fehler beim Speichern der Einwilligung.');
      } else {
        setSuccessMsg('Änderung revisionssicher gespeichert.');
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (e) {
      setConsents(prev => ({ ...prev, [type]: !nextVal }));
    } finally {
      setSavingKey(null);
    }
  };

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

  const CONSENT_ITEMS = [
    {
      key: 'photo_internal',
      icon: <Camera size={20} color="#15803d" />,
      title: 'Fotos & Videos für interne Zwecke',
      desc: 'Dokumentation von Schülervorspielen im internen Aushang der Musikschule und für Lehrzwecke.',
      badge: 'Empfohlen'
    },
    {
      key: 'concert_program',
      icon: <Award size={20} color="#0284c7" />,
      title: 'Nennung in Konzertprogrammen',
      desc: 'Abdruck des Vornamens und Instruments im gedruckten Programmheft bei Musikschul-Konzerten.',
      badge: 'Pädagogisch wertvoll'
    },
    {
      key: 'photo_social_media',
      icon: <Users size={20} color="#8b5cf6" />,
      title: 'Öffentlichkeitsarbeit & Website',
      desc: 'Veröffentlichung von Gruppenfotos und Ensemble-Aufnahmen auf der Website oder Social-Media-Kanälen der Musikschule.',
      badge: 'Optional'
    },
    {
      key: 'newsletter',
      icon: <Mail size={20} color="#f59e0b" />,
      title: 'Musikschul-Briefe & Eltern-Info',
      desc: 'Einladungen zu Ferienkursen, Meisterkursen und Elternabenden der Musikschule per E-Mail.',
      badge: 'Service'
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Introduction Card */}
      <div style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
        borderRadius: '20px',
        padding: '20px',
        border: '1.5px solid #bbf7d0',
        boxShadow: '0 4px 16px -2px rgba(22, 163, 74, 0.08)',
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#16a34a',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            flexShrink: 0
          }}>
            <ShieldCheck size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.01em' }}>
              Einwilligungen &amp; Medienfreigaben (Art. 7 &amp; 8 DSGVO)
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#334155', fontWeight: 600, lineHeight: 1.4 }}>
              Rechtssicher und transparent: Bestimme jederzeit frei, welche Medien und Daten für Konzerte verwendet werden dürfen. Jede Änderung ist sofort wirksam.
            </p>
          </div>
        </div>
      </div>

      {successMsg && (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: '12px',
          padding: '10px 14px',
          color: '#15803d',
          fontSize: '0.80rem',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Check size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Consent Toggles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {CONSENT_ITEMS.map((item) => {
          const isGranted = Boolean(consents[item.key]);
          const isBusy = savingKey === item.key;

          return (
            <div
              key={item.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 20px',
                borderRadius: '18px',
                background: '#ffffff',
                border: isGranted ? '1.5px solid #cbd5e1' : '1.5px solid #e2e8f0',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                gap: '14px',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{
                  padding: '10px',
                  borderRadius: '12px',
                  background: isGranted ? '#f0fdf4' : '#f8fafc',
                  flexShrink: 0
                }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 850, color: '#0f172a' }}>
                      {item.title}
                    </h4>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 750,
                      background: '#f1f5f9',
                      color: '#475569',
                      padding: '2px 8px',
                      borderRadius: '6px'
                    }}>
                      {item.badge}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 550, lineHeight: 1.4 }}>
                    {item.desc}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleToggleConsent(item.key)}
                style={{
                  minWidth: '44px',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'none',
                  border: 'none',
                  cursor: isBusy ? 'wait' : 'pointer',
                  padding: 0,
                  touchAction: 'manipulation'
                }}
                aria-label={`${item.title} ${isGranted ? 'widerrufen' : 'erteilen'}`}
              >
                <div
                  className={`app-binary-switch ${isGranted ? 'active' : ''}`}
                  style={{
                    backgroundColor: isGranted ? '#16a34a' : '#cbd5e1',
                    opacity: isBusy ? 0.6 : 1
                  }}
                >
                  <div className="app-binary-switch-knob" />
                </div>
              </button>
            </div>
          );
        })}
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
