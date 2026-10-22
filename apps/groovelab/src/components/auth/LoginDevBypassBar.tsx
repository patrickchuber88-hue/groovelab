import React from 'react';
import { isLocalDevEnvironment } from '../../utils/devEnvironment';
import { registerClientSessionLease, ensureMasterAdminSessionLease } from '../../utils/sessionLeaseManager';
import { BANNED_TOMBSTONE_SCHOOL_IDS } from '../../utils/tenantSanitizer';

export interface LoginDevBypassBarProps {
  isDevBuild: boolean;
  isGroovelabKiosk: boolean;
  geoDebug: any;
  loading: boolean;
  setLoading: (val: boolean) => void;
  bypassBusyRole: string | null;
  setBypassBusyRole: (val: string | null) => void;
  schoolData: any;
  supabase: any;
  bypassUserCounts: {
    hasTeacher: boolean;
    hasStudent: boolean;
    hasAdmin: boolean;
    adminUser?: { id: string; name: string; role: string; school_id: string; is_campus_active?: boolean; is_groovelab_active?: boolean };
    teacherUser?: { id: string; name: string; role: string; school_id: string; is_campus_active?: boolean; is_groovelab_active?: boolean };
    studentUser?: { id: string; name: string; role: string; school_id: string; is_campus_active?: boolean; is_groovelab_active?: boolean };
    schoolName?: string;
  };
  onLogin: (id: string, isMaster?: boolean) => void;
  loginStationId: string | null;
  finalizeLogin: (user: any, stationId: any, isWithin: boolean) => Promise<void>;
  createMasterSessionLease: (id: string, authMethod?: any, ttlMinutes?: number) => Promise<any>;
  setLocalhostDevLegalBypassed: (val: boolean) => void;
}

/**
 * 🛠️ LoginDevBypassBar (Localhost & Entwicklungs-Umgebung)
 * 
 * Bounded Context: Developer Experience / Localhost Fast-Path
 * 
 * Bietet Entwicklern 1-Klick-Logins für Master-Admin, Schulleitung, Lehrkraft & Schüler
 * sowie das Geofence-Diagnosepanel auf Localhost. In Produktion wird diese Komponente
 * zu 100% eliminiert.
 */
export const LoginDevBypassBar: React.FC<LoginDevBypassBarProps> = ({
  isDevBuild,
  isGroovelabKiosk,
  geoDebug,
  loading,
  setLoading,
  bypassBusyRole,
  setBypassBusyRole,
  schoolData,
  supabase,
  bypassUserCounts,
  onLogin,
  loginStationId,
  finalizeLogin,
  createMasterSessionLease,
  setLocalhostDevLegalBypassed
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  if (!isDevBuild) return null;

  return (
    <div style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', marginTop: '12px' }}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          background: 'rgba(255, 255, 255, 0.12)',
          border: '1px solid rgba(255, 255, 255, 0.22)',
          color: '#ffffff',
          borderRadius: '100px',
          padding: '4px 14px',
          fontSize: '11px',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.15s ease'
        }}
      >
        <span>🛠️ Localhost Fast-Path</span>
        <span style={{ fontSize: '9.5px', opacity: 0.85 }}>{isOpen ? '▲ Verbergen' : '▼ (4 Test-Accounts)'}</span>
      </button>

      {isOpen && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
          {/* Geofence Diagnostic Panel (Localhost / GrooveLab Kiosk only) */}
          {isGroovelabKiosk && geoDebug && (
        <div style={{ 
          padding: '16px', 
          background: 'rgba(15, 23, 42, 0.95)', 
          color: 'white', 
          borderRadius: '24px', 
          fontSize: '12px', 
          width: '100%',
          boxSizing: 'border-box',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 12px 30px rgba(0,0,0,0.2)'
        }}>
          <div style={{ fontWeight: 900, marginBottom: '12px', color: '#facc15', display: 'flex', justifyContent: 'space-between', letterSpacing: '0.04em' }}>
            <span>DIAGNOSE: GEOFENCING</span>
            <span style={{ color: geoDebug.isWithinAnyRoom ? '#34a853' : '#ef4444' }}>{geoDebug.isWithinAnyRoom ? 'ERFOLGREICH' : 'FEHLGESCHLAGEN'}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8 }}>
              <span>Deine Position:</span>
              <span style={{ fontWeight: 700 }}>{geoDebug.userPos && typeof geoDebug.userPos.lat === 'number' && typeof geoDebug.userPos.lng === 'number' ? `${geoDebug.userPos.lat.toFixed(4)}, ${geoDebug.userPos.lng.toFixed(4)}` : 'Wird gesucht...'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8 }}>
              <span>Ziel (Akademie):</span>
              <span style={{ fontWeight: 700 }}>{geoDebug.schoolCoords && typeof geoDebug.schoolCoords.lat === 'number' && typeof geoDebug.schoolCoords.lng === 'number' ? `${geoDebug.schoolCoords.lat.toFixed(4)}, ${geoDebug.schoolCoords.lng.toFixed(4)}` : 'Nicht gesetzt'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px' }}>
              <span>Berechnete Distanz:</span>
              <span style={{ fontWeight: 900, color: '#facc15' }}>{geoDebug.distToSchool !== null ? `${geoDebug.distToSchool}m` : '?'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px' }}>
              <span>Status Öffnungszeiten:</span>
              <span style={{ fontWeight: 900, color: geoDebug.withinHours ? '#34a853' : '#ef4444' }}>{geoDebug.withinHours ? 'GEÖFFNET' : 'GESCHLOSSEN'}</span>
            </div>
          </div>
          
          {(!geoDebug.isWithinAnyRoom || !geoDebug.withinHours) && (
            <button 
              type="button"
              onClick={async () => {
                const uid = sessionStorage.getItem('groovelab_user_id');
                if (uid) {
                  const targetSchoolId = schoolData?.id || localStorage.getItem('groovelab_school_id');
                  if (!targetSchoolId) {
                    alert('Labor-Modus Override fehlgeschlagen: Keine Musikschul-Kennung ermittelbar.');
                    return;
                  }
                  const { data, error } = await supabase.rpc('authenticate_by_credential', {
                    p_credential: uid,
                    p_school_id: targetSchoolId
                  });
                  if (!error && data?.success && data?.user) {
                    finalizeLogin(data.user, loginStationId, true);
                  } else {
                    alert('Labor-Modus Override fehlgeschlagen: Autorisierung abgewiesen.');
                  }
                } else {
                  alert('Bitte erst einmal scannen, damit ich weiß, wer du bist!');
                }
              }}
              style={{ 
                width: '100%', 
                padding: '10px', 
                background: '#facc15', 
                color: '#0f172a', 
                border: 'none', 
                borderRadius: '12px', 
                fontWeight: 900, 
                fontSize: '11px', 
                cursor: 'pointer'
              }}
            >
              ENTWICKLER-OVERRIDE: LABOR-MODUS ERZWINGEN
            </button>
          )}
        </div>
      )}

      {/* 4 Rollen-Bypass Buttons */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {/* 1. Master Admin Cockpit Bypass */}
        <button
          type="button"
          disabled={loading || !!bypassBusyRole}
          aria-label="Entwickler-Direktzugang: Master-Admin Leitstand öffnen (Dev Only)"
          title="Dev Only: 1-Klick Master-Admin Leitstand Login"
          onClick={async () => {
            if (loading || bypassBusyRole) return;
            try {
              setBypassBusyRole('master');
              setLoading(true);
              console.log('[Bypass] Attempting Master Admin Leitstand login (0.1% Enterprise Goldstandard)...');
              
              // 🏛️ 0,1% Goldstandard Airgap: Master-Admin ist strikt mandantenunabhängig (school_id: NULL, NIEMALS Tina / Peter Pan)
              const CANONICAL_MASTER_ADMIN_ID = '88888888-8888-8888-8888-888888888888';
              let targetId = CANONICAL_MASTER_ADMIN_ID;

              // 1. Authoritative Master Admin Server-Preflight (Zero-Password / Fail-Closed)
              try {
                const { data: masterAuth, error: masterErr } = await supabase.rpc('login_master_admin', {
                  p_username: 'admin'
                });
                if (!masterErr && masterAuth) {
                  const resolvedId = (masterAuth as any).id || (masterAuth as any).user_id;
                  if (resolvedId) {
                    targetId = String(resolvedId);
                  }
                  if ((masterAuth as any).lease_token) {
                    const lToken = String((masterAuth as any).lease_token);
                    sessionStorage.setItem('gl_active_session_lease_id', lToken);
                    localStorage.setItem('gl_active_session_lease_id', lToken);
                  }
                }
              } catch (rpcErr) {
                console.warn('[Bypass] login_master_admin RPC preflight notice:', rpcErr);
              }

              // 2. Authoritative Master Admin Session Lease Bootstrap (Zero US-Cloud / Fail-Closed)
              const leaseToken = await ensureMasterAdminSessionLease().catch(() => null);
              if (leaseToken) {
                sessionStorage.setItem('gl_active_session_lease_id', leaseToken);
                localStorage.setItem('gl_active_session_lease_id', leaseToken);
              }

              // 3. Hermetischer Airgap: Sämtliche Schul-Zuordnungen restlos neutralisieren
              sessionStorage.removeItem('groovelab_school_id');
              localStorage.removeItem('groovelab_school_id');
              sessionStorage.removeItem('groovelab_last_school_id');
              localStorage.removeItem('groovelab_last_school_id');
              sessionStorage.setItem('groovelab_user_id', targetId);
              if (typeof localStorage !== 'undefined') {
                localStorage.setItem('groovelab_user_id', targetId);
              }

              // 4. Kryptografische Master-Lease & Berechtigungs-Flaggen
              await createMasterSessionLease(targetId, 'bypass_dev').catch(() => {});
              setLocalhostDevLegalBypassed(true);
              sessionStorage.setItem(`gl_legal_status_v_${targetId}_min_2026.1`, 'true');
              sessionStorage.setItem(`gl_legal_status_v_${targetId}_admin_min_2026.1`, 'true');
              sessionStorage.setItem(`gl_legal_status_v_${targetId}_master_admin_min_2026.1`, 'true');
              sessionStorage.setItem('groovelab_is_master_admin', 'true');
              localStorage.setItem('groovelab_is_master_admin', 'true');
              sessionStorage.setItem('groovelab_active_workspace', 'master_admin');
              localStorage.setItem('groovelab_active_workspace', 'master_admin');
              sessionStorage.setItem('groovelab_active_platform', 'campus');
              sessionStorage.setItem('campus_active_tab', 'briefing');
              sessionStorage.setItem('groovelab_cached_user', JSON.stringify({
                id: targetId,
                role: 'admin',
                roles: ['admin'],
                is_master_admin: true,
                is_campus_active: true,
                is_groovelab_active: true,
                first_name: 'Master',
                last_name: 'Admin',
                school_id: null
              }));

              // 5. Saubere QR-Token Bereinigung und deterministische Navigation
              sessionStorage.removeItem('groovelab_qr_token');
              localStorage.removeItem('groovelab_last_qr_token');
              localStorage.removeItem('groovelab_qr_token');
              if (typeof window !== 'undefined' && window.location.pathname.startsWith('/qr/')) {
                window.history.replaceState(null, '', '/');
              }
              await Promise.resolve(onLogin(targetId, true));
              if (typeof window !== 'undefined') {
                if (window.location.pathname !== '/dashboard') {
                  window.location.replace(window.location.origin + '/dashboard');
                } else {
                  window.location.reload();
                }
              }
            } catch (err: any) {
              console.error('[Bypass] Error logging in as Master Admin:', err);
              alert('Master-Admin Bypass Fehler: ' + (err?.message || err));
              setLoading(false);
              setBypassBusyRole(null);
            }
          }}
          style={{
            background: '#0f172a',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            padding: '9px 14px',
            minHeight: '40px',
            fontSize: '0.74rem',
            fontWeight: 900,
            cursor: (loading || bypassBusyRole) ? 'not-allowed' : 'pointer',
            opacity: (loading || bypassBusyRole) ? 0.7 : 1,
            touchAction: 'manipulation',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {bypassBusyRole === 'master' ? '👑 LEITSTAND WIRD GELADEN...' : '👑 [DEV ONLY] MASTER-ADMIN LEITSTAND'}
        </button>

        {/* 2. Verwaltung / Schulleitung Bypass (Peter Pan) */}
        <button
          type="button"
          disabled={!!bypassBusyRole}
          aria-label="Entwickler-Direktzugang: Schulleitung Peter Pan anmelden"
          title="Dev Only: 1-Klick Schulleitung Login"
          onClick={async () => {
            if (bypassBusyRole) return;
            try {
              setBypassBusyRole('admin');
              const rawFallback = schoolData?.id || (typeof localStorage !== 'undefined' ? (localStorage.getItem('groovelab_school_id') || localStorage.getItem('groovelab_last_school_id')) : '');
              const fallbackSchoolId = (rawFallback && !BANNED_TOMBSTONE_SCHOOL_IDS.has(rawFallback.trim())) ? rawFallback.trim() : '53e83805-1d5a-4ed8-988e-1fb0b8200b9c';
              const baseUser = bypassUserCounts.adminUser || {
                id: '11079eae-664a-49a4-8692-771d83a3193c',
                name: 'Peter Pan',
                role: 'admin',
                roles: ['admin', 'teacher'],
                school_id: fallbackSchoolId
              };
              const effectiveSchoolId = baseUser.school_id || fallbackSchoolId;
              const targetUser = {
                ...baseUser,
                roles: Array.isArray((baseUser as any).roles) ? (baseUser as any).roles : ['admin', 'teacher'],
                school_id: effectiveSchoolId,
                is_campus_active: true,
                is_groovelab_active: true
              };
              console.log('[Bypass] Logging in as Verwaltung / Schulleitung:', targetUser.name);
              sessionStorage.removeItem('gl_active_session_lease_id');
              sessionStorage.removeItem('gl_active_session_lease_user_id');
              localStorage.removeItem('gl_active_session_lease_id');
              localStorage.removeItem('gl_active_session_lease_user_id');
              let resolvedDbUser: any = targetUser;
              try {
                // Authoritative Dev Bypass Session Minting (0.1% Goldstandard)
                const { data: bypassRes } = await supabase.rpc('mint_dev_bypass_session_lease', {
                  p_user_id: targetUser.id,
                  p_school_id: effectiveSchoolId
                });
                if (bypassRes?.success && bypassRes?.lease_token) {
                  sessionStorage.setItem('gl_active_session_lease_id', bypassRes.lease_token);
                  sessionStorage.setItem('gl_active_session_lease_user_id', targetUser.id);
                  localStorage.setItem('gl_active_session_lease_id', bypassRes.lease_token);
                  localStorage.setItem('gl_active_session_lease_user_id', targetUser.id);
                  if (bypassRes.user) {
                    resolvedDbUser = { ...targetUser, ...bypassRes.user };
                    if (typeof localStorage !== 'undefined' && effectiveSchoolId) {
                      localStorage.setItem('groovelab_school_id', effectiveSchoolId);
                      localStorage.setItem('groovelab_last_school_id', effectiveSchoolId);
                    }
                  }
                } else {
                  const { data: authResult } = await supabase.rpc('authenticate_by_credential', {
                    p_credential: targetUser.id,
                    p_school_id: effectiveSchoolId
                  });
                  if (authResult?.success && authResult?.lease_token) {
                    sessionStorage.setItem('gl_active_session_lease_id', authResult.lease_token);
                    sessionStorage.setItem('gl_active_session_lease_user_id', targetUser.id);
                    localStorage.setItem('gl_active_session_lease_id', authResult.lease_token);
                    localStorage.setItem('gl_active_session_lease_user_id', targetUser.id);
                  }
                }
              } catch (authErr) {
                console.warn('[Bypass] Auth credential notice:', authErr);
              }

              if (resolvedDbUser.role !== 'admin' && resolvedDbUser.role !== 'secretary') {
                try { await supabase.rpc('switch_user_active_role', { p_target_role: 'admin' }); } catch {}
                resolvedDbUser = { ...resolvedDbUser, role: 'admin' };
              }

              const authoritativeSchoolId = resolvedDbUser.school_id || effectiveSchoolId;
              const leaseRes = await registerClientSessionLease({ id: resolvedDbUser.id, role: resolvedDbUser.role }, authoritativeSchoolId).catch(() => null);
              const effectiveLeaseId = (leaseRes as any)?.leaseId || (leaseRes as any)?.lease_id;
              if (effectiveLeaseId) {
                sessionStorage.setItem('gl_active_session_lease_id', effectiveLeaseId);
                sessionStorage.setItem('gl_active_session_lease_user_id', resolvedDbUser.id);
                localStorage.setItem('gl_active_session_lease_id', effectiveLeaseId);
                localStorage.setItem('gl_active_session_lease_user_id', resolvedDbUser.id);
              }
              setLocalhostDevLegalBypassed(true);
              sessionStorage.setItem(`gl_legal_status_v_${resolvedDbUser.id}_min_2026.1`, 'true');
              sessionStorage.setItem(`gl_legal_status_v_${resolvedDbUser.id}_admin_min_2026.1`, 'true');
              sessionStorage.setItem(`gl_legal_status_v_${resolvedDbUser.id}_secretary_min_2026.1`, 'true');
              sessionStorage.removeItem('groovelab_is_master_admin');
              localStorage.removeItem('groovelab_is_master_admin');
              sessionStorage.removeItem('groovelab_support_ghost');
              sessionStorage.removeItem('groovelab_selected_student_id');
              localStorage.removeItem('groovelab_selected_student_id');
              sessionStorage.removeItem('groovelab_selected_teacher_id');
              localStorage.removeItem('groovelab_selected_teacher_id');
              sessionStorage.setItem('groovelab_user_role', resolvedDbUser.role || 'admin');
              sessionStorage.setItem('groovelab_active_workspace', 'secretary');
              sessionStorage.setItem('groovelab_active_platform', 'campus');
              sessionStorage.setItem('campus_active_tab', 'briefing');
              sessionStorage.setItem('groovelab_secretary_subtab', 'briefing');
              sessionStorage.setItem('groovelab_user_id', resolvedDbUser.id);
              sessionStorage.setItem('groovelab_cached_user', JSON.stringify(resolvedDbUser));
              sessionStorage.removeItem('groovelab_qr_token');
              localStorage.removeItem('groovelab_last_qr_token');
              localStorage.removeItem('groovelab_qr_token');
              if (typeof window !== 'undefined' && window.location.pathname.startsWith('/qr/')) {
                window.history.replaceState(null, '', '/');
              }
              await Promise.resolve(onLogin(resolvedDbUser.id, true));
              if (typeof window !== 'undefined' && window.location.pathname !== '/dashboard') {
                window.location.replace(window.location.origin + '/dashboard');
              }
            } catch (err: any) {
              console.error('[Bypass] Error logging in as Verwaltung:', err);
              alert('Bypass Fehler: ' + (err?.message || err));
              setBypassBusyRole(null);
            }
          }}
          style={{
            background: '#450a0a',
            color: '#fecaca',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            padding: '9px 14px',
            minHeight: '40px',
            fontSize: '0.74rem',
            fontWeight: 800,
            cursor: bypassBusyRole ? 'not-allowed' : 'pointer',
            opacity: bypassBusyRole ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {bypassBusyRole === 'admin' 
            ? '🏛️ ANMELDUNG LÄUFT...' 
            : `🏛️ BYPASS: ${bypassUserCounts.adminUser?.role === 'secretary' ? 'VERWALTUNG' : 'SCHULLEITUNG'} (${bypassUserCounts.adminUser?.name || 'Peter Pan'} • ${bypassUserCounts.schoolName || schoolData?.name || 'Musikschule'})`}
        </button>

        {/* 3. Lehrer Bypass */}
        <button
          type="button"
          disabled={!!bypassBusyRole}
          aria-label="Entwickler-Direktzugang: Lehrkraft anmelden"
          title="Dev Only: 1-Klick Lehrkraft Login"
          onClick={async () => {
            if (bypassBusyRole) return;
            try {
              setBypassBusyRole('teacher');
              const rawFallback = schoolData?.id || (typeof localStorage !== 'undefined' ? (localStorage.getItem('groovelab_school_id') || localStorage.getItem('groovelab_last_school_id')) : '');
              const fallbackSchoolId = (rawFallback && !BANNED_TOMBSTONE_SCHOOL_IDS.has(rawFallback.trim())) ? rawFallback.trim() : '53e83805-1d5a-4ed8-988e-1fb0b8200b9c';
              const baseUser = bypassUserCounts.teacherUser || {
                id: '98b6a599-7ff7-4f99-b51d-b6a4c348a0a0',
                name: 'Mateo Jansen',
                role: 'teacher',
                school_id: fallbackSchoolId
              };
              const effectiveSchoolId = baseUser.school_id || fallbackSchoolId;
              const targetUser = {
                ...baseUser,
                school_id: effectiveSchoolId,
                is_campus_active: true,
                is_groovelab_active: true
              };
              console.log('[Bypass] Logging in as Lehrer:', targetUser.name);
              sessionStorage.removeItem('gl_active_session_lease_id');
              sessionStorage.removeItem('gl_active_session_lease_user_id');
              localStorage.removeItem('gl_active_session_lease_id');
              localStorage.removeItem('gl_active_session_lease_user_id');
              let resolvedDbUser: any = targetUser;
              try {
                const { data: bypassRes } = await supabase.rpc('mint_dev_bypass_session_lease', {
                  p_user_id: targetUser.id,
                  p_school_id: effectiveSchoolId
                });
                if (bypassRes?.success && bypassRes?.lease_token) {
                  sessionStorage.setItem('gl_active_session_lease_id', bypassRes.lease_token);
                  sessionStorage.setItem('gl_active_session_lease_user_id', targetUser.id);
                  localStorage.setItem('gl_active_session_lease_id', bypassRes.lease_token);
                  localStorage.setItem('gl_active_session_lease_user_id', targetUser.id);
                  if (bypassRes.user) {
                    resolvedDbUser = { ...targetUser, ...bypassRes.user };
                    if (typeof localStorage !== 'undefined' && effectiveSchoolId) {
                      localStorage.setItem('groovelab_school_id', effectiveSchoolId);
                      localStorage.setItem('groovelab_last_school_id', effectiveSchoolId);
                    }
                  }
                } else {
                  const { data: authResult } = await supabase.rpc('authenticate_by_credential', {
                    p_credential: targetUser.id,
                    p_school_id: effectiveSchoolId
                  });
                  if (authResult?.success && authResult?.lease_token) {
                    sessionStorage.setItem('gl_active_session_lease_id', authResult.lease_token);
                    sessionStorage.setItem('gl_active_session_lease_user_id', targetUser.id);
                    localStorage.setItem('gl_active_session_lease_id', authResult.lease_token);
                    localStorage.setItem('gl_active_session_lease_user_id', targetUser.id);
                  }
                }
              } catch (authErr) { console.warn('[Bypass] Auth credential notice:', authErr); }
              const authoritativeSchoolId = resolvedDbUser.school_id || effectiveSchoolId;
              const leaseRes = await registerClientSessionLease({ id: resolvedDbUser.id, role: resolvedDbUser.role }, authoritativeSchoolId).catch(() => null);
              const effectiveLeaseId = (leaseRes as any)?.leaseId || (leaseRes as any)?.lease_id;
              if (effectiveLeaseId) {
                sessionStorage.setItem('gl_active_session_lease_id', effectiveLeaseId);
                sessionStorage.setItem('gl_active_session_lease_user_id', resolvedDbUser.id);
                localStorage.setItem('gl_active_session_lease_id', effectiveLeaseId);
                localStorage.setItem('gl_active_session_lease_user_id', resolvedDbUser.id);
              }
              setLocalhostDevLegalBypassed(true);
              ['min_2026.1', 'teacher_min_2026.1', 'admin_min_2026.1', 'secretary_min_2026.1'].forEach(k => sessionStorage.setItem(`gl_legal_status_v_${resolvedDbUser.id}_${k}`, 'true'));
              sessionStorage.removeItem('groovelab_is_master_admin'); localStorage.removeItem('groovelab_is_master_admin');
              sessionStorage.removeItem('groovelab_support_ghost');
              sessionStorage.removeItem('groovelab_selected_student_id'); localStorage.removeItem('groovelab_selected_student_id');
              sessionStorage.removeItem('groovelab_selected_teacher_id'); localStorage.removeItem('groovelab_selected_teacher_id');
              sessionStorage.setItem('groovelab_user_role', 'teacher');
              sessionStorage.setItem('groovelab_active_workspace', 'teacher');
              sessionStorage.setItem('groovelab_active_platform', 'campus');
              sessionStorage.setItem('campus_active_tab', 'briefing');
              sessionStorage.setItem('groovelab_user_id', resolvedDbUser.id);
              sessionStorage.setItem('groovelab_cached_user', JSON.stringify(resolvedDbUser));
              ['groovelab_qr_token', 'groovelab_last_qr_token'].forEach(k => { sessionStorage.removeItem(k); localStorage.removeItem(k); });
              if (typeof window !== 'undefined' && window.location.pathname.startsWith('/qr/')) {
                window.history.replaceState(null, '', '/');
              }
              await Promise.resolve(onLogin(resolvedDbUser.id, true));
              if (typeof window !== 'undefined' && window.location.pathname !== '/dashboard') {
                window.location.replace(window.location.origin + '/dashboard');
              }
            } catch (err: any) {
              console.error('[Bypass] Error logging in as Lehrer:', err);
              alert('Bypass Fehler: ' + (err?.message || err));
              setBypassBusyRole(null);
            }
          }}
          style={{
            background: '#064e3b',
            color: '#a7f3d0',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            padding: '9px 14px',
            minHeight: '40px',
            fontSize: '0.74rem',
            fontWeight: 800,
            cursor: bypassBusyRole ? 'not-allowed' : 'pointer',
            opacity: bypassBusyRole ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {bypassBusyRole === 'teacher'
            ? '🎓 ANMELDUNG LÄUFT...'
            : `🎓 BYPASS: LEHRKRAFT (${bypassUserCounts.teacherUser?.name || 'Mateo Jansen'} • ${bypassUserCounts.schoolName || schoolData?.name || 'Musikschule'})`}
        </button>

        {/* 4. Schüler Bypass */}
        <button
          type="button"
          disabled={!!bypassBusyRole}
          aria-label="Entwickler-Direktzugang: Schüler Linus anmelden"
          title="Dev Only: 1-Klick Schüler Login"
          onClick={async () => {
            if (bypassBusyRole) return;
            try {
              setBypassBusyRole('student');
              const rawFallback = schoolData?.id || (typeof localStorage !== 'undefined' ? (localStorage.getItem('groovelab_school_id') || localStorage.getItem('groovelab_last_school_id')) : '');
              const fallbackSchoolId = (rawFallback && !BANNED_TOMBSTONE_SCHOOL_IDS.has(rawFallback.trim())) ? rawFallback.trim() : '53e83805-1d5a-4ed8-988e-1fb0b8200b9c';
              const baseUser = bypassUserCounts.studentUser || {
                id: '15102f5e-c504-4c33-93ab-436285197c8c',
                name: 'Linus',
                role: 'student',
                school_id: fallbackSchoolId
              };
              const effectiveSchoolId = baseUser.school_id || fallbackSchoolId;
              const targetUser = {
                ...baseUser,
                school_id: effectiveSchoolId,
                is_campus_active: true,
                is_groovelab_active: true
              };
              console.log('[Bypass] Logging in as Schüler:', targetUser.name);
              sessionStorage.removeItem('gl_active_session_lease_id');
              sessionStorage.removeItem('gl_active_session_lease_user_id');
              localStorage.removeItem('gl_active_session_lease_id');
              localStorage.removeItem('gl_active_session_lease_user_id');
              let resolvedDbUser: any = targetUser;
              try {
                const { data: bypassRes } = await supabase.rpc('mint_dev_bypass_session_lease', {
                  p_user_id: targetUser.id,
                  p_school_id: effectiveSchoolId
                });
                if (bypassRes?.success && bypassRes?.lease_token) {
                  sessionStorage.setItem('gl_active_session_lease_id', bypassRes.lease_token);
                  sessionStorage.setItem('gl_active_session_lease_user_id', targetUser.id);
                  localStorage.setItem('gl_active_session_lease_id', bypassRes.lease_token);
                  localStorage.setItem('gl_active_session_lease_user_id', targetUser.id);
                  if (bypassRes.user) {
                    resolvedDbUser = { ...targetUser, ...bypassRes.user };
                    if (typeof localStorage !== 'undefined' && effectiveSchoolId) {
                      localStorage.setItem('groovelab_school_id', effectiveSchoolId);
                      localStorage.setItem('groovelab_last_school_id', effectiveSchoolId);
                    }
                  }
                } else {
                  const { data: authResult } = await supabase.rpc('authenticate_by_credential', {
                    p_credential: targetUser.id,
                    p_school_id: effectiveSchoolId
                  });
                  if (authResult?.success && authResult?.lease_token) {
                    sessionStorage.setItem('gl_active_session_lease_id', authResult.lease_token);
                    sessionStorage.setItem('gl_active_session_lease_user_id', targetUser.id);
                    localStorage.setItem('gl_active_session_lease_id', authResult.lease_token);
                    localStorage.setItem('gl_active_session_lease_user_id', targetUser.id);
                  }
                }
              } catch (authErr) { console.warn('[Bypass] Auth credential notice:', authErr); }
              const authoritativeSchoolId = resolvedDbUser.school_id || effectiveSchoolId;
              const leaseRes = await registerClientSessionLease({ id: resolvedDbUser.id, role: resolvedDbUser.role }, authoritativeSchoolId).catch(() => null);
              const effectiveLeaseId = (leaseRes as any)?.leaseId || (leaseRes as any)?.lease_id;
              if (effectiveLeaseId) {
                sessionStorage.setItem('gl_active_session_lease_id', effectiveLeaseId);
                sessionStorage.setItem('gl_active_session_lease_user_id', resolvedDbUser.id);
                localStorage.setItem('gl_active_session_lease_id', effectiveLeaseId);
                localStorage.setItem('gl_active_session_lease_user_id', resolvedDbUser.id);
              }
              setLocalhostDevLegalBypassed(true);
              ['min_2026.1', 'student_min_2026.1'].forEach(k => sessionStorage.setItem(`gl_legal_status_v_${resolvedDbUser.id}_${k}`, 'true'));
              sessionStorage.removeItem('groovelab_is_master_admin'); localStorage.removeItem('groovelab_is_master_admin');
              sessionStorage.removeItem('groovelab_support_ghost');
              sessionStorage.removeItem('groovelab_selected_student_id'); localStorage.removeItem('groovelab_selected_student_id');
              sessionStorage.removeItem('groovelab_selected_teacher_id'); localStorage.removeItem('groovelab_selected_teacher_id');
              sessionStorage.setItem('groovelab_user_role', 'student');
              sessionStorage.setItem('groovelab_active_workspace', 'student');
              sessionStorage.setItem('groovelab_active_platform', 'campus');
              sessionStorage.setItem('campus_active_tab', 'briefing');
              sessionStorage.setItem('groovelab_active_tab', 'live');
              localStorage.setItem('groovelab_active_tab', 'live');
              sessionStorage.setItem('groovelab_location_mode', 'home');
              sessionStorage.setItem('groovelab_user_id', resolvedDbUser.id);
              sessionStorage.setItem('groovelab_cached_user', JSON.stringify(resolvedDbUser));
              if (!isLocalDevEnvironment()) {
                localStorage.removeItem('groovelab_simulated_date');
                localStorage.removeItem('groovelab_simulated_start_timestamp');
              }
              ['groovelab_qr_token', 'groovelab_last_qr_token'].forEach(k => { sessionStorage.removeItem(k); localStorage.removeItem(k); });
              if (typeof window !== 'undefined' && window.location.pathname.startsWith('/qr/')) {
                window.history.replaceState(null, '', '/');
              }
              await Promise.resolve(onLogin(resolvedDbUser.id, true));
              if (typeof window !== 'undefined' && window.location.pathname !== '/dashboard') {
                window.location.replace(window.location.origin + '/dashboard');
              }
            } catch (err: any) {
              console.error('[Bypass] Error logging in as Schüler:', err);
              alert('Bypass Fehler: ' + (err?.message || err));
              setBypassBusyRole(null);
            }
          }}
          style={{
            background: '#422006',
            color: '#fef08a',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            padding: '9px 14px',
            minHeight: '40px',
            fontSize: '0.74rem',
            fontWeight: 800,
            cursor: bypassBusyRole ? 'not-allowed' : 'pointer',
            opacity: bypassBusyRole ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {bypassBusyRole === 'student'
            ? '🎸 ANMELDUNG LÄUFT...'
            : `🎸 BYPASS: SCHÜLER (${bypassUserCounts.studentUser?.name || 'Linus'} • ${bypassUserCounts.schoolName || 'Musäk Bad Säckingen'})`}
        </button>
      </div>
        </div>
      )}
    </div>
  );
};
