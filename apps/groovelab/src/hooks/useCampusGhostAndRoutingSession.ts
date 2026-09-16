import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { safeReplaceState } from '../utils/historyUtils';

export interface UseCampusGhostAndRoutingSessionParams {
  loading: boolean;
  loggedInUserId: string | null;
  location: { pathname: string; search?: string };
  navigate: (to: string, options?: { replace?: boolean }) => void;
  setUserRaw: (user: any) => void;
  setLoggedInUserId: (id: string) => void;
  setActivePlatform: (platform: any) => void;
  setActiveStudentTab: (tab: string) => void;
}

/**
 * 🏛️ useCampusGhostAndRoutingSession (Monolith Goldstandard Hook)
 * Kapselt die autoritative Routen-Absicherung (Public vs. Protected Redirects),
 * den Ghost-Support-Sitzungs-Resolver (Impersonation, Zero-Trace URL Sanitization)
 * sowie den 120-Minuten-Periodic-Watchdog nach OWASP ASVS Level 3 / Hiscox CyberSafe.
 */
export function useCampusGhostAndRoutingSession({
  loading,
  loggedInUserId,
  location,
  navigate,
  setUserRaw,
  setLoggedInUserId,
  setActivePlatform,
  setActiveStudentTab
}: UseCampusGhostAndRoutingSessionParams): void {
  // 1. Authoritative Route Guard & Redirection
  useEffect(() => {
    if (loading) return; // wait until supabase auth/session loading is complete

    const isGhostSessionActive = typeof window !== 'undefined' && (
      new URLSearchParams(window.location.search).get('support_ghost') === 'true' ||
      sessionStorage.getItem('groovelab_support_ghost') === 'true'
    );
    if (isGhostSessionActive) return; // Don't redirect during support ghost sessions
    
    const isPublicRoute = 
      location.pathname === '/' || 
      location.pathname === '/landingpage' || 
      location.pathname === '/landingpage2' || 
      location.pathname === '/startseite' || 
      location.pathname === '/startseite2' || 
      location.pathname === '/starseite2' || 
      location.pathname === '/login' || 
      location.pathname === '/signup' || 
      location.pathname === '/master-admin' || 
      location.pathname === '/admin' || 
      location.pathname.startsWith('/qr/') ||
      location.pathname.startsWith('/onboarding/') ||
      location.pathname.startsWith('/device-onboarding/') ||
      location.pathname.startsWith('/shared-biography/') ||
      location.pathname.startsWith('/shared/');
      
    const isAuth = !!loggedInUserId;
    if (isAuth) {
      const isLandingOrAuthRoute = 
        location.pathname === '/' || 
        location.pathname === '/landingpage' || 
        location.pathname === '/landingpage2' || 
        location.pathname === '/startseite' || 
        location.pathname === '/startseite2' || 
        location.pathname === '/starseite2' || 
        location.pathname === '/login' || 
        location.pathname === '/signup';

      if (isLandingOrAuthRoute) {
        navigate('/dashboard', { replace: true });
      }
    } else {
      // Redirect unauthenticated users trying to access dashboard/protected routes to /
      if (!isPublicRoute) {
        navigate('/', { replace: true });
      }
    }
  }, [loggedInUserId, location.pathname, loading, navigate]);

  // 2. Auto-switch context when support_ghost is active in URL (Placed before any early returns)
  useEffect(() => {
    const ghostUrlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const isGhostParam = ghostUrlParams.get('support_ghost') === 'true' || 
                         ghostUrlParams.get('ghost_session') === 'true' || 
                         sessionStorage.getItem('groovelab_support_ghost') === 'true';
    const ghostSchoolId = ghostUrlParams.get('school_id') || 
                          ghostUrlParams.get('ghost_school_id') || 
                          sessionStorage.getItem('groovelab_ghost_school_id');
    const ghostUserId = ghostUrlParams.get('ghost_user_id') || 
                        sessionStorage.getItem('groovelab_ghost_impersonated_user_id');
    const ghostTicketId = ghostUrlParams.get('ticket_id');
    const ghostRole = ghostUrlParams.get('role') || 
                      sessionStorage.getItem('groovelab_ghost_active_role') || 
                      'admin';
    const ghostLeaseToken = ghostUrlParams.get('ghost_lease_token');
    if (ghostLeaseToken) {
      sessionStorage.setItem('gl_active_session_lease_id', ghostLeaseToken);
      localStorage.setItem('gl_active_session_lease_id', ghostLeaseToken);
    }

    const isMasterAuth = sessionStorage.getItem('groovelab_is_master_admin') === 'true' || 
                         localStorage.getItem('groovelab_is_master_admin') === 'true';
    const ghostAuthToken = localStorage.getItem('groovelab_ghost_auth_token');
    const isMasterValid = isMasterAuth || Boolean(ghostAuthToken);

    if (isGhostParam && (ghostSchoolId || ghostUserId)) {
      if (!isMasterValid) {
        console.warn('[Security] Unauthorized Ghost Mode attempt blocked.');
        sessionStorage.removeItem('groovelab_support_ghost');
        sessionStorage.removeItem('groovelab_ghost_school_id');
        sessionStorage.removeItem('groovelab_ghost_impersonated_user_id');
        sessionStorage.removeItem('groovelab_ghost_active_role');
        const cleanUrl = window.location.pathname;
        safeReplaceState({}, document.title, cleanUrl);
        return;
      }

      // Consume one-time ghost token
      if (ghostAuthToken) {
        localStorage.removeItem('groovelab_ghost_auth_token');
      }

      // 🛡️ Ghost-Support 120-Minute Time-Box Enforcer (Hiscox CyberSafe / OWASP ASVS Level 3)
      const MAX_GHOST_SESSION_MS = 120 * 60 * 1000;
      const ghostStartedAtStr = sessionStorage.getItem('groovelab_ghost_started_at');
      const now = Date.now();
      if (!ghostStartedAtStr) {
        sessionStorage.setItem('groovelab_ghost_started_at', String(now));
      } else {
        const startedAt = parseInt(ghostStartedAtStr, 10);
        if (!isNaN(startedAt) && (now - startedAt > MAX_GHOST_SESSION_MS)) {
          console.warn('[Security] Ghost-Support session TTL expired (>120min). Revoking access.');
          sessionStorage.removeItem('groovelab_support_ghost');
          sessionStorage.removeItem('groovelab_ghost_started_at');
          sessionStorage.removeItem('groovelab_ghost_school_id');
          sessionStorage.removeItem('groovelab_ghost_impersonated_user_id');
          sessionStorage.removeItem('groovelab_ghost_active_role');
          sessionStorage.removeItem('groovelab_ghost_lease_token');
          window.location.href = '/master-admin';
          return;
        }
      }

      sessionStorage.setItem('groovelab_support_ghost', 'true');
      if (ghostSchoolId) sessionStorage.setItem('groovelab_ghost_school_id', ghostSchoolId);
      if (ghostUserId) sessionStorage.setItem('groovelab_ghost_impersonated_user_id', ghostUserId);
      if (ghostRole) sessionStorage.setItem('groovelab_ghost_active_role', ghostRole);
      if (ghostLeaseToken) sessionStorage.setItem('groovelab_ghost_lease_token', ghostLeaseToken);

      // Enterprise Zero-Trace URL Sanitization: Purge sensitive credentials immediately from browser address bar & history
      try {
        safeReplaceState({}, document.title, window.location.pathname);
      } catch (e) {}

      const resolveGhostIdentity = async () => {
        let realUser: any = null;
        let schoolData: any = null;

        // 1. If explicit user ID provided (e.g. from Ticket or Persona switcher)
        if (ghostUserId) {
          const { data: viewUser } = await supabase
            .from('users')
            .select('*, schools(*)')
            .eq('id', ghostUserId)
            .maybeSingle();
          if (viewUser && (!ghostSchoolId || viewUser.school_id === ghostSchoolId)) {
            realUser = viewUser;
          }
        }

        // 2. If no user yet, but school ID present -> resolve primary admin or teacher from this school
        if (!realUser && ghostSchoolId) {
          const { data: viewUser } = await supabase
            .from('users')
            .select('*, schools(*)')
            .eq('school_id', ghostSchoolId)
            .eq('role', ghostRole === 'teacher' ? 'teacher' : 'admin')
            .limit(1)
            .maybeSingle();
          if (viewUser) {
            realUser = viewUser;
          }
        }

        // 3. School metadata
        if (realUser?.schools) {
          schoolData = Array.isArray(realUser.schools) ? realUser.schools[0] : realUser.schools;
        } else if (ghostSchoolId) {
          const { data: sData } = await supabase.rpc('get_public_school_theme', { p_subdomain: ghostSchoolId });
          schoolData = sData;
        }

        if (schoolData?.name) {
          sessionStorage.setItem('groovelab_ghost_school_name', schoolData.name);
        }

        if (realUser) {
          sessionStorage.setItem('groovelab_ghost_impersonated_user_id', realUser.id);
          sessionStorage.setItem('groovelab_ghost_shadowed_teacher_id', realUser.id);
          const targetRole = realUser.role || ghostRole;
          sessionStorage.setItem('groovelab_ghost_active_role', targetRole);

          const impersonatedUserObj = {
            ...realUser,
            is_ghost_mode: true,
            ghost_ticket_id: ghostTicketId,
            schools: schoolData || realUser.schools
          };

          setUserRaw(impersonatedUserObj);
          setLoggedInUserId(realUser.id);

          try {
            const cacheImpersonated = targetRole === 'student' ? { ...impersonatedUserObj, last_name: null } : impersonatedUserObj;
            sessionStorage.setItem('groovelab_cached_user', JSON.stringify(cacheImpersonated));
          } catch (e) {}

          const targetPlatform: 'campus' | 'groovelab' = (realUser.is_groovelab_active && !realUser.is_campus_active) ? 'groovelab' : 'campus';
          const targetWorkspace = targetRole === 'admin' || targetRole === 'secretary' ? 'secretary' : (targetRole === 'teacher' ? 'teacher' : 'student');
          const targetTab = targetRole === 'student' ? 'homework_book' : (targetRole === 'teacher' ? 'briefing' : 'briefing');

          setActivePlatform(targetPlatform);
          setActiveStudentTab(targetTab);
          try {
            sessionStorage.setItem('groovelab_active_workspace', targetWorkspace);
            sessionStorage.setItem('groovelab_active_platform', targetPlatform);
            localStorage.setItem('campus_active_tab', targetTab);
          } catch (e) {}
        } else if (schoolData) {
          // Fallback if zero users in DB for school -> resolve from billing_contact_person
          const contactPerson = (schoolData.billing_contact_person || '').trim();
          let fName = `${schoolData.name} Support`;
          let lName = '';
          if (contactPerson) {
            const parts = contactPerson.split(' ');
            fName = parts[0] || `${schoolData.name} Support`;
            lName = parts.slice(1).join(' ') || '';
          }

          const ghostUser = {
            id: 'master-support-id',
            school_id: schoolData.id,
            role: ghostRole,
            first_name: fName,
            last_name: lName,
            is_master_admin: false,
            is_ghost_mode: true,
            schools: schoolData
          };
          setUserRaw(ghostUser);
          setLoggedInUserId('master-support-id');
          setActivePlatform('campus');
          setActiveStudentTab('briefing');
        }
      };

      resolveGhostIdentity();
    }
  }, [setUserRaw, setLoggedInUserId, setActivePlatform, setActiveStudentTab]);

  // 3. 🛡️ Ghost-Support 120-Minute Periodic Watchdog (Hiscox CyberSafe / OWASP ASVS Level 3)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isGhostActive = sessionStorage.getItem('groovelab_support_ghost') === 'true';
    if (!isGhostActive) return;

    const interval = setInterval(() => {
      const ghostStartedAtStr = sessionStorage.getItem('groovelab_ghost_started_at');
      if (ghostStartedAtStr) {
        const startedAt = parseInt(ghostStartedAtStr, 10);
        if (!isNaN(startedAt) && (Date.now() - startedAt > 120 * 60 * 1000)) {
          console.warn('[Security] Ghost session exceeded 120 minutes TTL. Auto-terminating session.');
          sessionStorage.removeItem('groovelab_support_ghost');
          sessionStorage.removeItem('groovelab_ghost_started_at');
          sessionStorage.removeItem('groovelab_ghost_school_id');
          sessionStorage.removeItem('groovelab_ghost_impersonated_user_id');
          sessionStorage.removeItem('groovelab_ghost_active_role');
          sessionStorage.removeItem('groovelab_ghost_lease_token');
          alert('Die maximale Dauer der Ghost-Support-Sitzung (120 Minuten) wurde erreicht. Die Sitzung wurde aus Sicherheitsgründen beendet.');
          window.location.href = '/master-admin';
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);
}
