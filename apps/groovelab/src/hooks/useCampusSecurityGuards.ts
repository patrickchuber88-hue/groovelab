import React, { useEffect, useMemo } from 'react';
import { verifyMasterSessionLease, createMasterSessionLease } from '../utils/masterAuditLogger';
import { isLocalDevEnvironment } from '../utils/devEnvironment';

export interface UseCampusSecurityGuardsParams {
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  activePlatform: 'campus' | 'groovelab' | 'ensembles';
  setActivePlatform: (platform: any) => void;
  setActiveWorkspace: (workspace: string) => void;
  setActiveStudentTab: (tab: string) => void;
  maintenanceState: any;
  maintenanceBypass: boolean;
  isLocalhost: boolean;
  supabase: any;
}

export interface UseCampusSecurityGuardsReturn {
  isGhostParam: boolean;
  ghostSchoolId: string | null;
  isMasterAdminSession: boolean;
  isMaintenanceLockoutActive: boolean;
  handleSwitchActiveRole: (newRole: string) => Promise<void>;
}

export function useCampusSecurityGuards({
  user,
  setUser,
  activePlatform,
  setActivePlatform,
  setActiveWorkspace,
  setActiveStudentTab,
  maintenanceState,
  maintenanceBypass,
  isLocalhost,
  supabase
}: UseCampusSecurityGuardsParams): UseCampusSecurityGuardsReturn {

  // Pre-calculate session and lockout hooks unconditionally BEFORE any early returns
  const ghostUrlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const isGhostParam = ghostUrlParams.get('support_ghost') === 'true' || (typeof window !== 'undefined' && sessionStorage.getItem('groovelab_support_ghost') === 'true');
  const ghostSchoolId = ghostUrlParams.get('school_id') || (typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_ghost_school_id') : null);

  const currentActiveWorkspace = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_active_workspace') || localStorage.getItem('groovelab_active_workspace')) : null;

  // SECURITY ISOLATION:
  // MasterAdminDashboard (Leitstand) is exclusively accessible if:
  // 1. User is verified in the DB as is_master_admin === true
  // 2. Session was explicitly authenticated via Master-Admin login / Leitstand bypass (sessionStorage.getItem('groovelab_is_master_admin') === 'true')
  // 3. Active workspace is 'master_admin' (never 'teacher', 'secretary', 'admin', 'student')
  // 4. User is not in support-ghost session mode
  const isMasterSessionExplicit = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_is_master_admin') === 'true') : false;
  const isMasterAdminSession = Boolean(
    user?.is_master_admin === true &&
    currentActiveWorkspace === 'master_admin' &&
    isMasterSessionExplicit
  ) && !(isGhostParam && ghostSchoolId);

  // Enterprise+ Tier 3: Master Admin Ephemeral Session Lease TTL Guard (Zero Standing Privileges)
  useEffect(() => {
    if (!isMasterAdminSession) return;

    const checkMasterLease = async () => {
      const { isValid } = await verifyMasterSessionLease();
      if (!isValid && sessionStorage.getItem('groovelab_is_master_admin') === 'true') {
        console.warn('[Security] Master Admin Session Lease abgelaufen. Auto-Lockout wird ausgeführt.');
        sessionStorage.removeItem('groovelab_is_master_admin');
        sessionStorage.removeItem('groovelab_user_id');
        window.location.href = '/';
      }
    };

    checkMasterLease();
    const interval = setInterval(checkMasterLease, 30000);
    return () => clearInterval(interval);
  }, [isMasterAdminSession]);

  const currentSchoolObj = Array.isArray(user?.schools) ? user.schools[0] : user?.schools;
  const currentSchoolId = user?.school_id || currentSchoolObj?.id;

  const isMaintenanceLockoutActive = useMemo(() => {
    if (!maintenanceState || !maintenanceState.isActive) return false;
    if (maintenanceBypass) return false;
    if (isMasterAdminSession) return false;

    // Check scope
    if (maintenanceState.scope === 'all') return true;
    if (maintenanceState.scope === 'campus_only' && activePlatform === 'campus') return true;
    if (maintenanceState.scope === 'groovelab_only' && activePlatform === 'groovelab') return true;
    if (maintenanceState.scope === 'schools_only' && currentSchoolId && (maintenanceState.targetSchoolIds || []).includes(currentSchoolId)) return true;

    return false;
  }, [maintenanceState, maintenanceBypass, isMasterAdminSession, activePlatform, currentSchoolId]);

  const handleSwitchActiveRole = async (newRole: string) => {
    try {
      const userId = user?.id;
      if (!userId) return;

      if (newRole === 'master_admin') {
        if (!isLocalDevEnvironment()) {
          console.warn('[Security] Master Admin workspace bypass is strictly prohibited in production environments.');
          return;
        }
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('groovelab_is_master_admin', 'true');
          sessionStorage.setItem('groovelab_active_workspace', 'master_admin');
          localStorage.setItem('groovelab_is_master_admin', 'true');
          localStorage.setItem('groovelab_active_workspace', 'master_admin');
          sessionStorage.setItem('groovelab_user_id', userId);
        }
        await createMasterSessionLease(userId, 'bypass_dev');
        window.location.reload();
        return;
      }

      // Determine target workspace, platform and tab immediately
      const targetWorkspace = (newRole === 'admin' || newRole === 'secretary')
        ? 'secretary'
        : (newRole === 'teacher' ? 'teacher' : 'student');

      let targetPlatform: 'campus' | 'groovelab' = 'campus';
      let startTab = 'briefing';

      if (newRole === 'teacher') {
        const schoolObj = Array.isArray(user?.schools) ? user.schools[0] : user?.schools;
        const schoolHasCampus = Boolean(
          user?.is_campus_active || 
          (schoolObj ? (schoolObj.has_campus_subscription || !schoolObj.is_billing_booked || schoolObj.subscription_bypass) : true)
        );
        const schoolHasGroove = Boolean(
          user?.is_groovelab_active || 
          (schoolObj ? (schoolObj.has_groovelab_subscription || !schoolObj.is_billing_booked || schoolObj.subscription_bypass) : true)
        );

        const savedPlat = typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_active_platform') : null;
        if (savedPlat === 'groovelab' && schoolHasGroove) {
          targetPlatform = 'groovelab';
        } else if (!schoolHasCampus && schoolHasGroove) {
          targetPlatform = 'groovelab';
        }

        const rawCampusTab = typeof window !== 'undefined' ? sessionStorage.getItem('campus_active_tab') : null;
        startTab = targetPlatform === 'campus' 
          ? ((rawCampusTab && rawCampusTab !== 'live') ? rawCampusTab : 'briefing')
          : 'live';
      }

      // 1. Immediately update workspace storage and platform/tab in sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('groovelab_active_workspace', targetWorkspace);
        sessionStorage.removeItem('groovelab_is_master_admin');
        if (targetWorkspace === 'secretary') {
          sessionStorage.setItem('groovelab_active_platform', 'campus');
          sessionStorage.setItem('campus_active_tab', 'briefing');
        } else if (targetWorkspace === 'teacher') {
          sessionStorage.removeItem('groovelab_secretary_subtab');
          sessionStorage.removeItem('groovelab_dual_role_switched_notice');
          sessionStorage.setItem('groovelab_active_platform', targetPlatform);
          sessionStorage.setItem(targetPlatform === 'campus' ? 'campus_active_tab' : 'groovelab_active_tab', startTab);
        }
      }

      if (isGhostParam) {
        sessionStorage.setItem('groovelab_ghost_active_role', newRole);
        sessionStorage.setItem('groovelab_support_ghost', 'true');
      }

      // 2. Transition local React state & cached user in lockstep
      React.startTransition(() => {
        setActiveWorkspace(targetWorkspace);
        setActivePlatform(targetPlatform);
        setActiveStudentTab(startTab);
        setUser((prevUser: any) => {
          if (!prevUser) return prevUser;
          const updated = { 
            ...prevUser, 
            role: newRole,
            last_name: newRole === 'student' ? null : prevUser.last_name,
            is_ghost_mode: prevUser.is_ghost_mode ?? isGhostParam
          };
          try {
            const userToCache = newRole === 'student' ? { ...updated, last_name: null } : updated;
            sessionStorage.setItem('groovelab_cached_user', JSON.stringify(userToCache));
          } catch (e) {}
          return updated;
        });
      });

      // 3. Await authoritative database role update via RPC (Fail-Closed, no client table update)
      try {
        const activeLeaseId = typeof window !== 'undefined' 
          ? sessionStorage.getItem('gl_active_session_lease_id')
          : null;
        
        let rpcErr: any = null;

        // Versuche primär den 2-Parameter-Aufruf mit Session-Lease-Scoping
        if (activeLeaseId) {
          const res = await supabase.rpc('switch_user_active_role', {
            p_target_role: newRole,
            p_lease_id: activeLeaseId
          });
          rpcErr = res.error;
        }

        // Graceful Degradation / Fallback: Wenn keine Lease-ID vorhanden ist oder das Backend
        // die 2-Parameter-Signatur noch nicht im PostgREST-Schema-Cache geladen hat (PGRST202)
        if (!activeLeaseId || (rpcErr && (rpcErr.message?.includes('schema cache') || rpcErr.code === 'PGRST202'))) {
          if (rpcErr) {
            console.warn('[Role Switch] 2-Parameter RPC nicht im Schema Cache, Fallback auf Basis-Signatur:', rpcErr.message);
          }
          const fallbackRes = await supabase.rpc('switch_user_active_role', {
            p_target_role: newRole
          });
          rpcErr = fallbackRes.error;
        }

        if (rpcErr) {
          console.error('[Role Switch] switch_user_active_role error:', rpcErr.message);
          if (!isLocalhost) {
            alert('Rollenwechsel fehlgeschlagen: ' + rpcErr.message);
            // Revert state if failed in production
            const previousRole = newRole === 'teacher' ? 'admin' : 'teacher';
            const previousWorkspace = previousRole === 'teacher' ? 'teacher' : 'secretary';
            sessionStorage.setItem('groovelab_active_workspace', previousWorkspace);
            setActiveWorkspace(previousWorkspace);
            setUser((prevUser: any) => prevUser ? { ...prevUser, role: previousRole } : prevUser);
            return;
          } else {
            console.warn('[Role Switch] Localhost resilience: allowing client role transition despite backend RPC notice:', rpcErr.message);
          }
        }
      } catch (err: any) {
        console.error('[Role Switch] Error:', err);
        if (!isLocalhost) {
          alert('Rollenwechsel fehlgeschlagen: ' + (err?.message || 'Verbindungsfehler'));
          return;
        }
      }
    } catch (err: any) {
      console.warn('Fehler beim Rollenwechsel:', err);
    }
  };

  return {
    isGhostParam,
    ghostSchoolId,
    isMasterAdminSession,
    isMaintenanceLockoutActive,
    handleSwitchActiveRole
  };
}
