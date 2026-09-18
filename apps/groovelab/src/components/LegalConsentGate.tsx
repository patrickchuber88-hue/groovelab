import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Scale, FileText, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Lock, Check, RefreshCw, WifiOff, Terminal } from 'lucide-react';
import { ACTIVE_LEGAL_VERSION, MINIMUM_ENFORCED_VERSION, LEGAL_DOCUMENTS, LEGAL_RELEASE_CONFIG, computeSha256, getLegalChangelog } from '../legal/legalContent';
import { isUUID } from '../utils/uuidValidator';
import { isDevEnvironment } from '../utils/tenantUrlHelper';

/**
 * Session-Cache für den legalen Zustimmungsstatus.
 * Ermöglicht 0ms Instant-Rendering ohne Layout-Shift.
 * Die autoritative Entscheidung liegt ausnahmslos beim Server-RPC `check_user_legal_status`
 * und den PostgreSQL RLS-Policies (OWASP ASVS Level 3 / Fail-Closed Doktrin).
 */
const LEGAL_SESSION_CACHE_PREFIX = 'gl_legal_status_v';
export const DEV_LEGAL_BYPASS_STORAGE_KEY = 'gl_dev_bypass_legal_gate';

/**
 * 🛡️ 1% Goldstandard Localhost Immunität:
 * Auf Localhost dev environment ist der Bypass standardmäßig aktiv (Zero Friction),
 * es sei denn, der Entwickler hat ihn im Dev-Menü explizit auf 'false' gesetzt, um die Maske zu testen.
 * In Production (oder bei echten Domains) gibt diese Funktion AUSNAHMSLOS false zurück (Fail-Closed).
 */
export function isLocalhostDevLegalBypassed(): boolean {
  if (typeof window === 'undefined') return false;
  if (!isDevEnvironment()) return false;
  try {
    const override = localStorage.getItem(DEV_LEGAL_BYPASS_STORAGE_KEY);
    if (override === 'false') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function setLocalhostDevLegalBypassed(bypassed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DEV_LEGAL_BYPASS_STORAGE_KEY, bypassed ? 'true' : 'false');
  } catch {}
}

function isSessionCacheCompliant(userId: string, minVersion: string): boolean {
  if (typeof window === 'undefined' || !userId) return false;
  try {
    const key = `${LEGAL_SESSION_CACHE_PREFIX}_${userId}_min_${minVersion}`;
    return sessionStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function setSessionCacheCompliant(userId: string, minVersion: string, compliant: boolean): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    const key = `${LEGAL_SESSION_CACHE_PREFIX}_${userId}_min_${minVersion}`;
    if (compliant) {
      sessionStorage.setItem(key, 'true');
    } else {
      sessionStorage.removeItem(key);
    }
  } catch {}
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
  const isDev = typeof window !== 'undefined' && isDevEnvironment();

  const isDevBypassed = isDev && isLocalhostDevLegalBypassed();
  const cachedCompliant = user?.id 
    ? (isSessionCacheCompliant(user.id, MINIMUM_ENFORCED_VERSION) || isDevBypassed) 
    : false;

  // Initialize compliant state optimistically if valid session cache or localhost dev bypass is present
  const [isCompliant, setIsCompliant] = useState<boolean>(() => {
    if (!user?.id || !isUUID(user.id) || user.is_ghost_mode) return true;
    if (isDevBypassed) return true;
    return Boolean(cachedCompliant);
  });
  const [isChecking, setIsChecking] = useState<boolean>(() => {
    if (!user?.id || !isUUID(user.id) || user.is_ghost_mode || isDevBypassed) return false;
    return !cachedCompliant;
  });
  const [isNetworkBlocked, setIsNetworkBlocked] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [checkedMandatory, setCheckedMandatory] = useState<boolean>(false);
  const [checkedAudio, setCheckedAudio] = useState<boolean>(false); // Strict DSGVO opt-in (EuGH Planet49 & Art. 8 DSGVO)
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showFullText, setShowFullText] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [latestAcceptedVersion, setLatestAcceptedVersion] = useState<string | null>(null);
  const [isMajorUpdateFlow, setIsMajorUpdateFlow] = useState<boolean>(false);

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

  // 1. Cross-Tab Realtime Broadcast Synchronization
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel('gl_legal_consent_sync');
    channel.onmessage = (event) => {
      if (event.data?.type === 'CONSENT_GRANTED' && event.data?.userId === user?.id) {
        setIsCompliant(true);
        setIsChecking(false);
        setIsNetworkBlocked(false);
        setSessionCacheCompliant(user.id, MINIMUM_ENFORCED_VERSION, true);
      }
    };
    return () => {
      channel.close();
    };
  }, [user?.id]);

  // 2. Authoritative check with adaptive timeout & resilient schema fallback
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

      // 🛡️ 1% Goldstandard: Localhost Dev-Immunity Fast Path
      if (isDev && isLocalhostDevLegalBypassed()) {
        if (isMounted) {
          setIsCompliant(true);
          setIsChecking(false);
          setIsNetworkBlocked(false);
          setSessionCacheCompliant(user.id, MINIMUM_ENFORCED_VERSION, true);
        }
        return;
      }

      // If cached session is not compliant, we show the non-blocking progress indicator
      if (!cachedCompliant) {
        setIsChecking(true);
      }
      setErrorMsg(null);
      setIsNetworkBlocked(false);

      try {
        const queryTimeoutMs = isDev ? 12000 : 8000;

        const executeCheckRpc = async () => {
          // Primary: 4-parameter call (Migration 441 - Decoupled active & minimum enforced)
          let rpcRes = await supabase.rpc('check_user_legal_status', {
            p_user_id: user.id,
            p_role: role,
            p_required_version: ACTIVE_LEGAL_VERSION,
            p_minimum_enforced_version: MINIMUM_ENFORCED_VERSION
          });

          // 🛡️ Resilient Schema-Cache Fallback: If remote DB has not yet applied Migration 441,
          // PostgREST returns PGRST202 (function signature with 4 parameters not found).
          // Fall back gracefully to the canonical 3-parameter call from Migration 375!
          if (rpcRes.error && (rpcRes.error.code === 'PGRST202' || rpcRes.error.message?.includes('schema cache'))) {
            console.info('[LegalConsentGate] 4-parameter check_user_legal_status not in remote schema cache. Falling back to 3-parameter signature...');
            rpcRes = await supabase.rpc('check_user_legal_status', {
              p_user_id: user.id,
              p_role: role,
              p_required_version: MINIMUM_ENFORCED_VERSION
            });
          }

          return rpcRes;
        };

        const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) => {
          setTimeout(() => reject(new Error('RPC_TIMEOUT')), queryTimeoutMs);
        });

        const res = await Promise.race([executeCheckRpc(), timeoutPromise]) as any;
        const { data, error } = res || {};

        if (error) {
          console.warn('[LegalConsentGate] Check RPC error:', error.message);
          if (isMounted) {
            // Localhost / Dev Immunity: Never lock out developers on local machine due to remote transients
            if (isDev) {
              console.info('[LegalConsentGate] Dev environment: auto-passing on transient RPC error.');
              setIsCompliant(true);
              setIsNetworkBlocked(false);
              setSessionCacheCompliant(user.id, MINIMUM_ENFORCED_VERSION, true);
            } else if (!cachedCompliant) {
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
            setSessionCacheCompliant(user.id, MINIMUM_ENFORCED_VERSION, true);
          } else {
            // 🛡️ 1% Goldstandard Localhost Immunität: Im Dev-Modus mit aktivem Bypass niemals zurücksetzen
            if (isDev && isLocalhostDevLegalBypassed()) {
              console.info('[LegalConsentGate] Localhost Dev-Immunity: preserving active bypass state.');
              setIsCompliant(true);
              setIsNetworkBlocked(false);
              setSessionCacheCompliant(user.id, MINIMUM_ENFORCED_VERSION, true);
            } else {
              setIsCompliant(false);
              setIsNetworkBlocked(false);
              if (data?.latest_accepted_version) {
                setLatestAcceptedVersion(data.latest_accepted_version);
                setIsMajorUpdateFlow(true);
              } else {
                setIsMajorUpdateFlow(false);
              }
              setSessionCacheCompliant(user.id, MINIMUM_ENFORCED_VERSION, false);
            }
          }
          setIsChecking(false);
        }
      } catch (err: any) {
        console.warn('[LegalConsentGate] Check status timed out or network failed:', err);
        if (isMounted) {
          // Localhost / Dev Immunity: Auto-pass on timeout in Vite DEV mode
          if (isDev) {
            console.info('[LegalConsentGate] Dev environment: auto-passing on network timeout.');
            setIsCompliant(true);
            setIsNetworkBlocked(false);
          } else if (!cachedCompliant) {
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

  // 3. Record consent
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
          is_student_minor_flow: isStudent,
          is_major_reconsent: isMajorUpdateFlow,
          previous_version: latestAcceptedVersion || null
        }
      });

      if (error) {
        console.error('[LegalConsentGate] Record consent error:', error);
        setErrorMsg('Zustimmung konnte serverseitig nicht gespeichert werden. Bitte versuchen Sie es erneut.');
        return;
      }

      setSessionCacheCompliant(user.id, MINIMUM_ENFORCED_VERSION, true);

      // Realtime Cross-Tab Broadcast notification
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const channel = new BroadcastChannel('gl_legal_consent_sync');
          channel.postMessage({ type: 'CONSENT_GRANTED', userId: user.id, version: ACTIVE_LEGAL_VERSION });
          channel.close();
        }
      } catch {}

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

  // 3b. 1% Goldstandard Localhost Dev-Bypass Action (Persistent Dual-Action)
  const handleDevBypassClick = async () => {
    if (user?.id) {
      setLocalhostDevLegalBypassed(true);
      setSessionCacheCompliant(user.id, MINIMUM_ENFORCED_VERSION, true);

      // Fire-and-forget: Asynchroner DB-Eintrag, damit auch PostgreSQL autoritativ synchronisiert ist
      try {
        const consentTypes: string[] = [primaryDocKey];
        const docHashes: Record<string, string> = {
          [primaryDocKey]: await computeSha256(primaryDoc.fullTextMarkdown)
        };
        if (isStudent) {
          consentTypes.push('consent_media_audio');
          docHashes['consent_media_audio'] = await computeSha256(audioDoc.fullTextMarkdown);
        }
        void supabase.rpc('record_user_legal_consent', {
          p_user_id: user.id,
          p_school_id: user.school_id || null,
          p_role: role,
          p_consent_types: consentTypes,
          p_version: ACTIVE_LEGAL_VERSION,
          p_document_hashes: docHashes,
          p_user_agent: 'Localhost Dev-Sandbox Bypass (1-Klick)',
          p_ip_hash: null,
          p_metadata: { dev_bypass: true, client_timestamp: new Date().toISOString() }
        });
      } catch {}

      // Cross-Tab Broadcast
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const channel = new BroadcastChannel('gl_legal_consent_sync');
          channel.postMessage({ type: 'CONSENT_GRANTED', userId: user.id, version: ACTIVE_LEGAL_VERSION });
          channel.close();
        }
      } catch {}
    }

    setIsCompliant(true);
    setIsNetworkBlocked(false);
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
        {/* 🛠️ Localhost / Dev-Sandbox Immunity Pill */}
        {isDev && (
          <div style={{
            position: 'fixed',
            top: '16px',
            left: '16px',
            zIndex: 100000,
            background: '#1e293b',
            color: '#38bdf8',
            padding: '6px 12px',
            borderRadius: '12px',
            fontSize: '0.74rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
            border: '1px solid #334155'
          }}>
            <Terminal size={14} color="#38bdf8" />
            <span>Localhost Dev-Sandbox</span>
            <button
              type="button"
              onClick={handleDevBypassClick}
              style={{
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Dev Bypass (1-Klick)
            </button>
          </div>
        )}

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

          {isDev && (
            <button
              type="button"
              onClick={handleDevBypassClick}
              style={{
                width: '100%',
                marginTop: '14px',
                padding: '10px 16px',
                borderRadius: '14px',
                border: '1px dashed #38bdf8',
                background: '#0f172a',
                color: '#38bdf8',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Terminal size={14} color="#38bdf8" />
              <span>Entwickler-Bypass (Localhost Dev-Sandbox)</span>
            </button>
          )}
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
  const activeChangelog = getLegalChangelog(ACTIVE_LEGAL_VERSION);

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
      {/* 🛠️ Localhost / Dev-Sandbox Immunity Pill */}
      {isDev && (
        <div style={{
          position: 'fixed',
          top: '16px',
          left: '16px',
          zIndex: 100000,
          background: '#1e293b',
          color: '#38bdf8',
          padding: '6px 12px',
          borderRadius: '12px',
          fontSize: '0.74rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
          border: '1px solid #334155'
        }}>
          <Terminal size={14} color="#38bdf8" />
          <span>Localhost Dev-Sandbox</span>
          <button
            type="button"
            onClick={handleDevBypassClick}
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '3px 8px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Dev Bypass (1-Klick)
          </button>
        </div>
      )}

      <div 
        role="dialog"
        aria-modal="true"
        aria-label={isMajorUpdateFlow ? `Vertrags-Aktualisierung Version ${ACTIVE_LEGAL_VERSION}` : primaryDoc.title}
        style={{
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
        }}
      >
        {/* Header Bar - ZONE 1: RECHTLICHER KONTEXT & DIFFERENZ-STATUS */}
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
                {isMajorUpdateFlow ? 'Vertrags-Aktualisierung' : primaryDoc.badge}
              </span>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#64748b'
              }}>
                Version {ACTIVE_LEGAL_VERSION} • Revisionssicher
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
              {isMajorUpdateFlow ? `Aktualisierung: ${primaryDoc.title}` : primaryDoc.title}
            </h2>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '0.84rem',
              color: '#475569',
              fontWeight: 500
            }}>
              {isMajorUpdateFlow 
                ? `Wesentliche didaktische Anpassung (Bisherige Bestätigung: Version ${latestAcceptedVersion || '2026.1'})` 
                : primaryDoc.subtitle}
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

        {/* Body Content - ZONE 2: CHANGELOG-LENS & TRANSPARENZGEBOT */}
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

          {/* 🔍 Major-Update Changelog-Lens (Delta-Fokus gem. BGH XI ZR 26/20) */}
          {isMajorUpdateFlow && activeChangelog ? (
            <div style={{
              background: themeBgLight,
              border: `1.5px solid ${themeBorder}`,
              borderRadius: '18px',
              padding: '16px 18px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.76rem',
                fontWeight: 800,
                color: themeColor,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '10px'
              }}>
                <Scale size={16} />
                <span>Was ist neu in Version {ACTIVE_LEGAL_VERSION}? (Art. 12 DSGVO / § 307 BGB):</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeChangelog.highlights.map((pt, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.82rem', color: '#0f172a', lineHeight: 1.4 }}>
                    <CheckCircle2 size={16} color={themeColor} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontWeight: 600 }}>{pt}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Kaltstart-Kernpunkte für Erstnutzer */
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '18px',
              padding: '16px 18px'
            }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                Wichtigste Kernpunkte im Überblick (Transparenzgebot gem. § 307 BGB &amp; Art. 12 DSGVO):
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
          )}

          {/* Optional Toggle Full Text Accordion (§ 305 Abs. 2 BGB) */}
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
              <span>{showFullText ? 'Vollständigen Vertragstext ausblenden' : 'Vollständigen konsolidierten Vertragstext anzeigen & prüfen'}</span>
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

          {/* ZONE 3: RECHTSSICHERES OPT-IN (EuGH Planet49 & BFSG 2025 Konform) */}
          <div 
            role="button"
            tabIndex={0}
            aria-checked={checkedMandatory}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setCheckedMandatory(!checkedMandatory);
              }
            }}
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
              {isMajorUpdateFlow ? (
                `Ich erkenne die aktualisierten Vertragsbedingungen (Version ${ACTIVE_LEGAL_VERSION}) sowie den Didaktik-Kodex an und nehme ausdrücklich zur Kenntnis, dass die gesetzliche Aufsichtspflicht (§ 1631 BGB) personell bei der Lehrkraft verbleibt.`
              ) : (
                primaryDoc.checkboxLabel
              )}
            </div>
          </div>

          {/* Optional Audio Consent Checkbox for Students (Kopplungsverbot-Schutz gem. Art. 7 Abs. 4 DSGVO) */}
          {isStudent && (
            <div 
              role="button"
              tabIndex={0}
              aria-checked={checkedAudio}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setCheckedAudio(!checkedAudio);
                }
              }}
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
                <span>{isMajorUpdateFlow ? 'Änderungen verbindlich bestätigen' : 'Rechtssicher bestätigen & Weiter'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
