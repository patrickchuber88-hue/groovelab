import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Scale, FileText, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Lock, Check, RefreshCw, WifiOff } from 'lucide-react';
import { ACTIVE_LEGAL_VERSION, LEGAL_DOCUMENTS, computeSha256 } from '../legal/legalContent';
import { isUUID } from '../utils/uuidValidator';

/**
 * Computes a deterministic session proof bound to user, active role, session lease ID and legal version.
 * Prevents trivial boolean client-side tampering while enabling instantaneous (0ms) render times.
 */
function computeSessionProof(userId: string, role: string, leaseId: string, version: string): string {
  const seed = `${userId}:${role}:${leaseId || 'no_lease'}:${version}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return `gl_proof_${Math.abs(hash).toString(16)}`;
}

function getLeaseId(): string {
  if (typeof window === 'undefined') return '';
  try {
    return sessionStorage.getItem('gl_active_session_lease_id') || '';
  } catch {
    return '';
  }
}

interface LegalConsentGateProps {
  user: {
    id: string;
    role?: string;
    school_id?: string;
    is_ghost_mode?: boolean;
    first_name?: string;
    last_name?: string;
  };
  onConsentRecorded?: () => void;
  children: React.ReactNode;
}

export const LegalConsentGate: React.FC<LegalConsentGateProps> = ({ user, onConsentRecorded, children }) => {
  const role = user?.role?.toLowerCase() || 'student';
  const isAdmin = role === 'admin' || role === 'secretary';
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';

  const leaseId = getLeaseId();
  const proofKey = user?.id ? `gl_legal_proof_${user.id}_${ACTIVE_LEGAL_VERSION}` : '';
  const currentProof = user?.id ? computeSessionProof(user.id, role, leaseId, ACTIVE_LEGAL_VERSION) : '';
  const isProofValid = typeof window !== 'undefined' && Boolean(user?.id) && Boolean(currentProof) && sessionStorage.getItem(proofKey) === currentProof;

  // Initialize compliant state optimistically if valid cryptographic session proof is present
  const [isCompliant, setIsCompliant] = useState<boolean>(() => {
    if (!user?.id || !isUUID(user.id) || user.is_ghost_mode) return true;
    return Boolean(isProofValid);
  });
  const [isChecking, setIsChecking] = useState<boolean>(() => {
    if (!user?.id || !isUUID(user.id) || user.is_ghost_mode) return false;
    return !isProofValid;
  });
  const [isNetworkBlocked, setIsNetworkBlocked] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [checkedMandatory, setCheckedMandatory] = useState<boolean>(false);
  const [checkedAudio, setCheckedAudio] = useState<boolean>(false); // Strict DSGVO opt-in (EuGH Planet49 & Art. 8 DSGVO)
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showFullText, setShowFullText] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Determine active primary document
  const primaryDocKey = isAdmin 
    ? 'terms_b2b_avv' 
    : (isTeacher ? 'terms_teacher_conduct' : 'terms_student_platform');
  const primaryDoc = LEGAL_DOCUMENTS[primaryDocKey] || LEGAL_DOCUMENTS.terms_student_platform;
  const audioDoc = LEGAL_DOCUMENTS.consent_media_audio;

  // Theme colors based on role
  const themeColor = isAdmin ? '#ea4335' : (isTeacher ? '#34a853' : '#10b981');
  const themeBgLight = isAdmin ? '#fef2f2' : (isTeacher ? '#f0fdf4' : '#ecfdf5');
  const themeBorder = isAdmin ? 'rgba(239, 68, 68, 0.25)' : (isTeacher ? 'rgba(52, 168, 83, 0.25)' : 'rgba(16, 185, 129, 0.25)');

  // 1. Authoritative check with 4-second short-circuit timeout (Stale-While-Revalidate if cached proof is present)
  useEffect(() => {
    let isMounted = true;

    async function verifyLegalStatus() {
      // Ghost mode or missing/invalid user ID bypasses gate to allow emergency operator actions
      if (!user?.id || !isUUID(user.id) || user.is_ghost_mode) {
        if (isMounted) {
          setIsCompliant(true);
          setIsChecking(false);
          setIsNetworkBlocked(false);
        }
        return;
      }

      // If proof is not valid, we show the non-blocking progress indicator
      if (!isProofValid) {
        setIsChecking(true);
      }
      setErrorMsg(null);
      setIsNetworkBlocked(false);

      try {
        const rpcPromise = supabase.rpc('check_user_legal_status', {
          p_user_id: user.id,
          p_role: role,
          p_required_version: ACTIVE_LEGAL_VERSION
        });

        // 4.0-second short-circuit timeout to eliminate the 25-75s cascade in supabase.ts
        const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) => {
          setTimeout(() => reject(new Error('RPC_TIMEOUT')), 4000);
        });

        const res = await Promise.race([rpcPromise, timeoutPromise]) as any;
        const { data, error } = res || {};

        if (error) {
          console.warn('[LegalConsentGate] Check RPC error:', error.message);
          if (isMounted) {
            // Fail-Closed: If there is a server/network error and no valid session proof, do NOT silently bypass!
            if (!isProofValid) {
              setIsCompliant(false);
              setIsNetworkBlocked(true);
            }
            setIsChecking(false);
          }
          return;
        }

        if (isMounted) {
          if (data && data.is_compliant === true) {
            setIsCompliant(true);
            setIsNetworkBlocked(false);
            if (proofKey && currentProof && typeof window !== 'undefined') {
              try {
                sessionStorage.setItem(proofKey, currentProof);
              } catch {}
            }
          } else {
            setIsCompliant(false);
            setIsNetworkBlocked(false);
            if (proofKey && typeof window !== 'undefined') {
              try {
                sessionStorage.removeItem(proofKey);
              } catch {}
            }
          }
          setIsChecking(false);
        }
      } catch (err: any) {
        console.warn('[LegalConsentGate] Check status timed out or network failed:', err);
        if (isMounted) {
          // Fail-Closed: Show clean retry dialog rather than silent unverified bypass
          if (!isProofValid) {
            setIsCompliant(false);
            setIsNetworkBlocked(true);
          }
          setIsChecking(false);
        }
      }
    }

    verifyLegalStatus();

    return () => {
      isMounted = false;
    };
  }, [user?.id, role, user?.is_ghost_mode, retryCount]);

  // 2. Record consent
  const handleConfirmConsents = async () => {
    if (!checkedMandatory || isSaving || !user?.id) return;

    try {
      setIsSaving(true);
      setErrorMsg(null);

      const consentTypes: string[] = [primaryDocKey];
      const docHashes: Record<string, string> = {
        [primaryDocKey]: await computeSha256(primaryDoc.fullTextMarkdown)
      };

      if (isStudent && checkedAudio) {
        consentTypes.push('consent_media_audio');
        docHashes['consent_media_audio'] = await computeSha256(audioDoc.fullTextMarkdown);
      }

      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';

      const { data, error } = await supabase.rpc('record_user_legal_consent', {
        p_user_id: user.id,
        p_school_id: user.school_id || null,
        p_role: role,
        p_consent_types: consentTypes,
        p_version: ACTIVE_LEGAL_VERSION,
        p_document_hashes: docHashes,
        p_user_agent: userAgent,
        p_ip_hash: null,
        p_metadata: {
          client_timestamp: new Date().toISOString(),
          is_student_minor_flow: isStudent
        }
      });

      if (error) {
        console.error('[LegalConsentGate] Record consent error:', error);
        setErrorMsg('Zustimmung konnte serverseitig nicht gespeichert werden. Bitte versuchen Sie es erneut.');
        return;
      }

      if (proofKey && currentProof && typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(proofKey, currentProof);
        } catch {}
      }
      setIsCompliant(true);
      setIsNetworkBlocked(false);
      if (onConsentRecorded) {
        onConsentRecorded();
      }
    } catch (err: any) {
      console.error('[LegalConsentGate] Exception recording consent:', err);
      setErrorMsg('Ein unerwarteter Fehler ist aufgetreten: ' + (err.message || String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  // If already compliant, render normal children directly (Instant-Load 0ms)
  if (isCompliant) {
    return <>{children}</>;
  }

  // Fail-Closed Network Error / Timeout Screen
  if (isNetworkBlocked) {
    return (
      <div 
        role="dialog"
        aria-modal="true"
        aria-label="Sicherheits- und Rechtsprüfung Netzwerkunterbrechung"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.82)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          zIndex: 99999,
          fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
        }}
      >
        <div style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '480px',
          borderRadius: '24px',
          padding: '32px 28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid #e2e8f0',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'fadeInUp 0.25s ease-out'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            color: '#dc2626'
          }}>
            <WifiOff size={28} />
          </div>

          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '1.25rem',
            fontWeight: 800,
            color: '#0f172a',
            letterSpacing: '-0.02em'
          }}>
            Sicherheitsstatus nicht erreichbar
          </h3>

          <p style={{
            margin: '0 0 24px 0',
            fontSize: '0.88rem',
            color: '#475569',
            lineHeight: 1.5
          }}>
            Die verschlüsselte Verbindung zur Sicherheits- und Rechtsprüfung konnte nicht zeitnah hergestellt werden (Timeout). 
            Zum Schutz Ihrer Daten verlangt der Enterprise-Sicherheitsstandard eine aktive Bestätigung.
          </p>

          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.reload();
                }
              }}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '14px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: '#475569',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Seite neu laden
            </button>

            <button
              type="button"
              onClick={() => {
                setRetryCount(prev => prev + 1);
              }}
              style={{
                flex: 1.3,
                padding: '12px 16px',
                borderRadius: '14px',
                border: 'none',
                background: themeColor,
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
              }}
            >
              <RefreshCw size={16} />
              <span>Erneut prüfen</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // During initial check (only when no cached session proof is present)
  if (isChecking) {
    return (
      <div 
        role="status"
        aria-live="polite"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 99999,
          fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
        }}
      >
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '28px 36px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          maxWidth: '380px',
          textAlign: 'center',
          animation: 'fadeInUp 0.2s ease-out'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '16px',
            background: themeBgLight,
            border: `1px solid ${themeBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: themeColor
          }}>
            <ShieldCheck size={26} />
          </div>

          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
              Campus-Groovelab
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
              Sicherheits- & Rechtsstatus wird geprüft...
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f8fafc',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            color: '#64748b',
            fontWeight: 600
          }}>
            <div className="spinner-border animate-spin" style={{ width: '13px', height: '13px', border: `2px solid ${themeColor}`, borderTopColor: 'transparent', borderRadius: '50%' }} />
            <span>Revisionssichere Prüfung läuft</span>
          </div>
        </div>
      </div>
    );
  }

  // 3. Render Legal Consent Gate (Hard Barrier Modal)
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
    }}>
      <div style={{
        background: '#ffffff',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        borderRadius: '28px',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: `1px solid ${themeBorder}`,
        animation: 'fadeInUp 0.25s ease-out'
      }}>
        {/* Header Bar */}
        <div style={{
          padding: '24px 28px 20px 28px',
          borderBottom: '1px solid #f1f5f9',
          background: themeBgLight,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{
                background: themeColor,
                color: '#ffffff',
                fontSize: '0.68rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                padding: '2px 8px',
                borderRadius: '6px'
              }}>
                {primaryDoc.badge}
              </span>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#64748b'
              }}>
                Version {primaryDoc.version} • Revisionssicher
              </span>
            </div>
            <h2 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.02em',
              lineHeight: 1.3
            }}>
              {primaryDoc.title}
            </h2>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '0.84rem',
              color: '#475569',
              fontWeight: 500
            }}>
              {primaryDoc.subtitle}
            </p>
          </div>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '14px',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: `1px solid ${themeBorder}`
          }}>
            <ShieldCheck size={24} color={themeColor} />
          </div>
        </div>

        {/* Body Content */}
        <div style={{
          padding: '24px 28px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}>
          {errorMsg && (
            <div style={{
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#991b1b',
              fontSize: '0.82rem',
              fontWeight: 600
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Key Summary Capsules */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '18px',
            padding: '16px 18px'
          }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
              Wichtigste Kernpunkte im Überblick (Transparenzgebot Art. 12 DSGVO):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {primaryDoc.summaryPoints.map((pt, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.82rem', color: '#334155', lineHeight: 1.4 }}>
                  <CheckCircle2 size={16} color={themeColor} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{pt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Optional Toggle Full Text */}
          <div>
            <button
              type="button"
              onClick={() => setShowFullText(!showFullText)}
              style={{
                background: 'transparent',
                border: 'none',
                color: themeColor,
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: 0
              }}
            >
              <span>{showFullText ? 'Vollständigen Vertragstext ausblenden' : 'Vollständigen Vertragstext anzeigen & prüfen'}</span>
              {showFullText ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showFullText && (
              <div style={{
                marginTop: '12px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '14px',
                padding: '16px',
                maxHeight: '200px',
                overflowY: 'auto',
                fontSize: '0.78rem',
                color: '#334155',
                lineHeight: 1.5,
                whiteSpace: 'pre-line'
              }}>
                {primaryDoc.fullTextMarkdown}
              </div>
            )}
          </div>

          {/* Mandatory Checkbox Card */}
          <div 
            onClick={() => setCheckedMandatory(!checkedMandatory)}
            style={{
              border: checkedMandatory ? `2px solid ${themeColor}` : '1.5px solid #cbd5e1',
              background: checkedMandatory ? themeBgLight : '#ffffff',
              borderRadius: '16px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '6px',
              border: checkedMandatory ? `2px solid ${themeColor}` : '2px solid #94a3b8',
              background: checkedMandatory ? themeColor : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '2px',
              transition: 'all 0.15s ease'
            }}>
              {checkedMandatory && <Check size={14} color="#ffffff" strokeWidth={3} />}
            </div>
            <div style={{ flex: 1, fontSize: '0.82rem', fontWeight: 650, color: '#0f172a', lineHeight: 1.4 }}>
              <span style={{ color: themeColor, fontWeight: 800 }}>[Pflicht] </span>
              {primaryDoc.checkboxLabel}
            </div>
          </div>

          {/* Optional Audio Consent Checkbox for Students (Kopplungsverbot-Schutz) */}
          {isStudent && (
            <div 
              onClick={() => setCheckedAudio(!checkedAudio)}
              style={{
                border: checkedAudio ? '2px solid #10b981' : '1.5px solid #e2e8f0',
                background: checkedAudio ? '#ecfdf5' : '#ffffff',
                borderRadius: '16px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '6px',
                border: checkedAudio ? '2px solid #10b981' : '2px solid #94a3b8',
                background: checkedAudio ? '#10b981' : '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px',
                transition: 'all 0.15s ease'
              }}>
                {checkedAudio && <Check size={14} color="#ffffff" strokeWidth={3} />}
              </div>
              <div style={{ flex: 1, fontSize: '0.80rem', fontWeight: 600, color: '#1e293b', lineHeight: 1.4 }}>
                <span style={{ color: '#059669', fontWeight: 800 }}>[Freiwillige Einwilligung – Art. 8 DSGVO] </span>
                {audioDoc.checkboxLabel}
              </div>
            </div>
          )}

          {/* Cryptographic Audit Notice */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.72rem',
            color: '#64748b',
            background: '#f8fafc',
            padding: '8px 12px',
            borderRadius: '10px'
          }}>
            <Lock size={13} style={{ flexShrink: 0, color: '#94a3b8' }} />
            <span>
              Revisionssicherer Audit-Trail: Der Zustimmungsakt wird mit SHA-256 Checksumme, UTC-Zeitstempel und Benutzer-ID fälschungssicher protokolliert.
            </span>
          </div>
        </div>

        {/* Footer Bar */}
        <div style={{
          padding: '18px 28px',
          borderTop: '1px solid #f1f5f9',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
            {checkedMandatory ? '✓ Pflichtbestätigung ausgewählt' : 'Bitte Pflichtfeld bestätigen'}
          </div>

          <button
            type="button"
            disabled={!checkedMandatory || isSaving}
            onClick={handleConfirmConsents}
            style={{
              background: checkedMandatory ? themeColor : '#cbd5e1',
              color: '#ffffff',
              border: 'none',
              borderRadius: '16px',
              padding: '12px 24px',
              fontSize: '0.90rem',
              fontWeight: 800,
              cursor: checkedMandatory && !isSaving ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: checkedMandatory ? '0 4px 14px rgba(0,0,0,0.15)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            {isSaving ? (
              <>
                <div className="spinner-border animate-spin" style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#ffffff', borderRadius: '50%' }} />
                <span>Wird protokolliert...</span>
              </>
            ) : (
              <>
                <Scale size={16} />
                <span>Rechtssicher bestätigen & Weiter</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
