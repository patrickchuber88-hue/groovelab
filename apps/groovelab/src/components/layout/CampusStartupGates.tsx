import React, { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { Music, Clock } from 'lucide-react';
import { ErrorBoundary, DashboardLoader } from '../ui/ErrorBoundary';
import { LegalConsentGate } from '../LegalConsentGate';

// Lazy-loaded routes & gate views
const BandProfileContent = lazy(() => import('../BandProfileContent'));
const QRCodeModal = lazy(() => import('../QRCodeModal').then(m => ({ default: m.QRCodeModal })));
const DeviceSetupScreen = lazy(() => import('../DeviceSetupScreen').then(m => ({ default: m.DeviceSetupScreen })));
const StudentOnboardingPage = lazy(() => import('../StudentOnboardingPage').then(m => ({ default: m.StudentOnboardingPage })));
const DeviceOnboardingPage = lazy(() => import('../DeviceOnboardingPage').then(m => ({ default: m.DeviceOnboardingPage })));
const QRLandingPage = lazy(() => import('../QRLandingPage').then(m => ({ default: m.QRLandingPage })));
const SharedAudioBiographyPage = lazy(() => import('../campus/SharedAudioBiographyPage').then(m => ({ default: m.SharedAudioBiographyPage })));
const SignupWizard = lazy(() => import('../SignupWizard').then(m => ({ default: m.SignupWizard })));
const LoginScreen = lazy(() => import('../LoginScreen').then(m => ({ default: m.LoginScreen })));
const Startseite = lazy(() => import('../Startseite').then(m => ({ default: m.Startseite })));
const Startseite2 = lazy(() => import('../Startseite2').then(m => ({ default: m.Startseite2 })));
const SchoolSelfOnboardingModal = lazy(() => import('../SchoolSelfOnboardingModal').then(m => ({ default: m.SchoolSelfOnboardingModal })));
const ContractEndPrompt = lazy(() => import('../ContractEndPrompt').then(m => ({ default: m.ContractEndPrompt })));
const MasterAdminDashboard = lazy(() => import('../MasterAdminDashboard').then(m => ({ default: m.MasterAdminDashboard })));
const SecretaryDashboard = lazy(() => import('../SecretaryDashboard').then(m => ({ default: m.SecretaryDashboard })));
const GhostSupportCapsule = lazy(() => import('../masterAdmin/GhostSupportCapsule').then(m => ({ default: m.GhostSupportCapsule })));

export interface CampusStartupGatesProps {
  location: any;
  searchParams: URLSearchParams;
  selectedBandForProfile: any;
  showBandProfile: boolean;
  user: any;
  bandProfileView: 'public' | 'backstage';
  setBandProfileView: (view: any) => void;
  brandColor: string;
  width: number;
  APP_INSTRUMENT_COLORS: any;
  APP_INSTRUMENT_ICONS: any;
  setShowBandProfile: (show: boolean) => void;
  setEditingBand: (band: any) => void;
  setShowEditBand: (show: boolean) => void;
  setShowAvatarPicker: (show: boolean) => void;
  setAvatarPickerType: (type: any) => void;
  isSharedView: boolean;
  publicPassUser: any;
  loadingKiosk: boolean;
  kioskRoomIdParam: string | null;
  kioskSetupParam: string | null;
  kioskBootstrapping: boolean;
  effectiveQrToken?: string | null;
  qrPathMatch?: any;
  navigate: (to: string, options?: any) => void;
  handleLogin: (userId: string, isHome?: boolean, stationId?: string | null) => Promise<void> | void;
  loggedInUserId: string | null;
  isKioskMode: boolean;
  stationIdFromStorage: string | null;
  setShowPrivacy: (show: boolean) => void;
  setShowAgb: (show: boolean) => void;
  setShowImpressum: (show: boolean) => void;
  setShowAccessibility: (show: boolean) => void;
  renderLegalModals: () => React.ReactNode;
  showSchoolOnboardingModal: boolean;
  setShowSchoolOnboardingModal: (show: boolean) => void;
  showDeletionPrompt: boolean;
  deletionPromptUserId: string | null;
  deletionPromptIsHome?: boolean;
  setShowDeletionPrompt: (show: boolean) => void;
  setDeletionPromptUserId: (id: string | null) => void;
  isMasterAdminSession: boolean;
  handleLogout: (confirmFirst?: boolean, hardPurge?: boolean) => void;
  loading: boolean;
  supabase: any;
  setLoggedInUserId: (id: string | null) => void;
  setUser: (user: any) => void;
  setLoading: (loading: boolean) => void;
  activeWorkspace: string | null;
  isGhostParam: boolean;
  handleSwitchActiveRole: (role: string) => Promise<void> | void;
  activePlatform: string;
  isSchoolPaused?: boolean;
}

export function renderCampusStartupGates(props: CampusStartupGatesProps): React.ReactElement | null {
  const {
    location,
    searchParams,
    selectedBandForProfile,
    showBandProfile,
    user,
    bandProfileView,
    setBandProfileView,
    brandColor,
    width,
    APP_INSTRUMENT_COLORS,
    APP_INSTRUMENT_ICONS,
    setShowBandProfile,
    setEditingBand,
    setShowEditBand,
    setShowAvatarPicker,
    setAvatarPickerType,
    isSharedView,
    publicPassUser,
    loadingKiosk,
    kioskRoomIdParam,
    kioskSetupParam,
    kioskBootstrapping,
    effectiveQrToken,
    qrPathMatch,
    navigate,
    handleLogin,
    loggedInUserId,
    isKioskMode,
    stationIdFromStorage,
    setShowPrivacy,
    setShowAgb,
    setShowImpressum,
    setShowAccessibility,
    renderLegalModals,
    showSchoolOnboardingModal,
    setShowSchoolOnboardingModal,
    showDeletionPrompt,
    deletionPromptUserId,
    deletionPromptIsHome,
    setShowDeletionPrompt,
    setDeletionPromptUserId,
    isMasterAdminSession,
    handleLogout,
    loading,
    supabase,
    setLoggedInUserId,
    setUser,
    setLoading,
    activeWorkspace,
    isGhostParam,
    handleSwitchActiveRole,
    activePlatform,
    isSchoolPaused
  } = props;

  const urlBandId = searchParams.get('band');

  // 1. PUBLIC BAND VIEW (Prioritized for sharing)
  if (urlBandId) {
    if (selectedBandForProfile && showBandProfile) {
      return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 6000, background: '#09090b', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {/* Small non-clickable brand indicator for public visitors */}
          <div style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 10, display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.5 }}>
            <div style={{ width: '32px', height: '32px', background: '#fefce8', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Music size={18} color="#eab308" />
            </div>
            <div style={{ color: 'white', fontWeight: 900, fontSize: '1rem', letterSpacing: '0.05em' }}>GROOVELAB</div>
          </div>
          <BandProfileContent 
            selectedBandForProfile={selectedBandForProfile} 
            user={user} 
            bandProfileView={bandProfileView} 
            setBandProfileView={setBandProfileView} 
            brandColor={brandColor} 
            width={width} 
            APP_INSTRUMENT_COLORS={APP_INSTRUMENT_COLORS} 
            APP_INSTRUMENT_ICONS={APP_INSTRUMENT_ICONS} 
            setShowBandProfile={setShowBandProfile} 
            setEditingBand={setEditingBand} 
            setShowEditBand={setShowEditBand} 
            setShowAvatarPicker={setShowAvatarPicker}
            setAvatarPickerType={setAvatarPickerType}
            isSharedView={isSharedView}
          />
        </div>
      );
    }
    // Show a minimalist loading state for public visitors
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 6000, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="animate-spin" style={{ width: '24px', height: '24px', border: '2px solid #e2e8f0', borderTopColor: '#eab308', borderRadius: '50%' }}></div>
      </div>
    );
  }

  // 1.5 PUBLIC CAMPUS PASS VIEW
  const urlCampusPassToken = searchParams.get('campus_pass');
  if (urlCampusPassToken) {
    if (publicPassUser) {
      return (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          zIndex: 6000, 
          background: '#09090b', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '24px',
          overflowY: 'auto'
        }}>
          {/* Brand header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ width: '32px', height: '32px', background: '#e6f4ea', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#34a853', fontWeight: 900, fontSize: '1.2rem' }}>C</span>
            </div>
            <div style={{ color: 'white', fontWeight: 900, fontSize: '1rem', letterSpacing: '0.05em' }}>CAMPUS PASS</div>
          </div>
          
          {/* Standing credit-card style layout */}
          <div style={{ maxWidth: '380px', width: '100%' }}>
            <Suspense fallback={<div style={{ color: 'white', textAlign: 'center', fontSize: '0.85rem' }}>Lade QR Code...</div>}>
              <QRCodeModal 
                user={publicPassUser} 
                activePlatform="campus" 
                onClose={() => {
                  window.close();
                }} 
              />
            </Suspense>
          </div>
        </div>
      );
    }
    // Show a minimalist loading state for public visitors
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 6000, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
        <div className="animate-spin" style={{ width: '24px', height: '24px', border: '2px solid #e2e8f0', borderTopColor: '#34a853', borderRadius: '50%' }}></div>
        <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Lade Campus Pass...</div>
      </div>
    );
  }

  // 1.7 KIOSK RESOLUTION SPINNER
  if (loadingKiosk) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#eab308', borderRadius: '50%' }}></div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Lade Kiosk-Konfiguration…</div>
      </div>
    );
  }

  // 1.8a KIOSK SETUP MODE: kiosk_room_id + kiosk_setup=1 → show DeviceSetupScreen
  if (kioskRoomIdParam && kioskSetupParam === '1') {
    return (
      <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}><div style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8' }}>Lade Setup...</div></div>}>
        <DeviceSetupScreen />
      </Suspense>
    );
  }

  // 1.8b KIOSK ROOM AUTO-BOOTSTRAP (show spinner while resolving station)
  if (kioskBootstrapping) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#eab308', borderRadius: '50%' }}></div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Kiosk wird gestartet…</div>
      </div>
    );
  }

  // 0. ONBOARDING PAGE
  const onboardingPathMatch = location.pathname.match(/^\/onboarding\/([^/?#]+)/);
  if (onboardingPathMatch) {
    return (
      <Suspense fallback={<DashboardLoader />}>
        <StudentOnboardingPage token={onboardingPathMatch[1]} />
      </Suspense>
    );
  }

  // 0.0 DEVICE ONBOARDING PAGE
  const deviceOnboardingPathMatch = location.pathname.match(/^\/device-onboarding\/([^/?#]+)/);
  if (deviceOnboardingPathMatch) {
    return (
      <Suspense fallback={<DashboardLoader />}>
        <DeviceOnboardingPage token={deviceOnboardingPathMatch[1]} />
      </Suspense>
    );
  }

  // 0.1 QR LANDING PAGE — Weg 2: Nativer Kamera-Scan oder fixer QR-Token-Link
  const urlParams = new URLSearchParams(location.search);
  const isInviteSchoolLink = urlParams.has('invite_school_id');
  const queryQrToken = !isInviteSchoolLink ? (urlParams.get('token') || urlParams.get('qr_token')) : null;

  const sessionQrToken = typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_qr_token') : null;
  const localLastQrToken = typeof window !== 'undefined' ? localStorage.getItem('groovelab_last_qr_token') : null;
  const activeSessionUserId = typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_user_id') : null;

  const resolvedEffectiveQrToken = (effectiveQrToken !== undefined && effectiveQrToken !== null)
    ? effectiveQrToken
    : (!isInviteSchoolLink && (qrPathMatch 
        ? qrPathMatch[1] 
        : (queryQrToken || (!activeSessionUserId && sessionQrToken) || (location.pathname.startsWith('/qr/') ? localLastQrToken : null))));

  if (resolvedEffectiveQrToken) {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('groovelab_qr_token', resolvedEffectiveQrToken);
      localStorage.setItem('groovelab_last_qr_token', resolvedEffectiveQrToken);
      if (!location.pathname.startsWith('/qr/')) {
        if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
          window.history.replaceState(null, '', `/qr/${resolvedEffectiveQrToken}`);
        }
      }
    }

    const isStandalone = typeof window !== 'undefined' && ((window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches);
    const currentUserId = typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_user_id') : null;

    if (isStandalone && currentUserId) {
      const externalUrl = `${window.location.origin}/qr/${resolvedEffectiveQrToken}?auto_pair=true`;
      window.open(externalUrl, '_blank');
      navigate('/dashboard', { replace: true });
    } else {
      return (
        <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b' }}>Lade Campus Pass...</div>}>
          <QRLandingPage token={resolvedEffectiveQrToken} />
        </Suspense>
      );
    }
  }

  // 0.9 PUBLIC SHARED AUDIO-BIOGRAPHY LANDING PAGE
  if (location.pathname.startsWith('/shared-biography/') || location.pathname.startsWith('/shared/') || location.pathname.startsWith('/bio/')) {
    const studentIdParam = location.pathname.split('/').filter(Boolean).pop();
    return (
      <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#090d16', color: '#64748b' }}>Lade Audio-Biografie...</div>}>
        <SharedAudioBiographyPage studentId={studentIdParam} />
      </Suspense>
    );
  }

  // 1. SIGNUP WIZARD
  if (location.pathname === '/signup') {
    return (
      <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b' }}>Lade Registrierung...</div>}>
        <SignupWizard 
          onBackToLogin={() => {
            navigate('/login');
          }} 
          onSignupSuccess={(uid) => {
            handleLogin(uid, false);
          }}
        />
      </Suspense>
    );
  }

  // 1.1 STARTSEITE & DETAILED LANDING PAGES
  if (location.pathname === '/' || location.pathname === '/landingpage' || location.pathname === '/startseite') {
    if (loggedInUserId) {
      return <Navigate to="/dashboard" replace />;
    }

    const urlParams = new URLSearchParams(location.search);
    const hasSubdomain = (() => {
      if (typeof window === 'undefined') return false;
      const host = window.location.hostname;
      let sub = null;
      const mainDomains = ['.campus-groovelab.de', '.groovelab.de', '.campus-groovelab.com'];
      for (const domain of mainDomains) {
        if (host.endsWith(domain)) {
          sub = host.substring(0, host.length - domain.length);
          break;
        }
      }
      if (!sub) {
        const parts = host.split('.');
        if (parts.length >= 3) {
          const first = parts[0];
          if (first !== 'www' && first !== 'admin' && first !== 'campus-groovelab') {
            sub = first;
          }
        } else if (parts.length === 2 && parts[1] === 'localhost') {
          sub = parts[0];
        }
      }
      if (!sub) {
        sub = urlParams.get('school') || urlParams.get('subdomain');
      }
      return !!sub;
    })();

    const isExplicitSchoolLogin = !loggedInUserId && location.pathname === '/' && (
      urlParams.has('invite_school_id') || 
      urlParams.get('onboarding') === 'parent' || 
      urlParams.get('platform') === 'groovelab' ||
      urlParams.has('school_id') ||
      urlParams.has('school') ||
      urlParams.has('subdomain') ||
      hasSubdomain || 
      urlParams.has('kiosk')
    );

    if (isExplicitSchoolLogin) {
      return (
        <ErrorBoundary>
          <Suspense fallback={<DashboardLoader />}>
            <LoginScreen onLogin={handleLogin} kioskStationId={isKioskMode ? stationIdFromStorage : null} />
          </Suspense>
        </ErrorBoundary>
      );
    }

    return (
      <Suspense fallback={<DashboardLoader />}>
        <Startseite 
          onLogin={() => navigate(loggedInUserId ? '/dashboard' : '/login')} 
          onRegister={(email) => navigate(email ? `/signup?email=${encodeURIComponent(email)}` : '/signup')} 
          onShowPrivacy={() => setShowPrivacy(true)}
          onShowAgb={() => setShowAgb(true)}
          onShowImpressum={() => setShowImpressum(true)}
          onShowAccessibility={() => setShowAccessibility(true)}
        />
        {renderLegalModals()}
      </Suspense>
    );
  }

  if (location.pathname === '/landingpage2' || location.pathname === '/startseite2') {
    if (loggedInUserId) {
      return <Navigate to="/dashboard" replace />;
    }
    return (
      <Suspense fallback={<DashboardLoader />}>
        <Startseite2 
          onLogin={() => navigate('/login')} 
          onRegister={(email) => navigate(email ? `/signup?email=${encodeURIComponent(email)}` : '/signup')} 
          onShowPrivacy={() => setShowPrivacy(true)}
          onShowAgb={() => setShowAgb(true)}
          onShowImpressum={() => setShowImpressum(true)}
        />
        {renderLegalModals()}
      </Suspense>
    );
  }

  // 2. AUTHENTICATION CHECK
  if (!loggedInUserId && !showDeletionPrompt) {
    if (showSchoolOnboardingModal) {
      return (
        <div style={{ position: 'relative', minHeight: '100vh', background: '#0f172a' }}>
          <Suspense fallback={<DashboardLoader />}>
            <SchoolSelfOnboardingModal
              onClose={() => {
                setShowSchoolOnboardingModal(false);
                navigate('/', { replace: true });
              }}
              onSuccess={(schoolData, userData) => {
                setShowSchoolOnboardingModal(false);
                if (userData?.id) {
                  handleLogin(userData.id, false);
                } else {
                  navigate('/login', { replace: true });
                  window.location.reload();
                }
              }}
            />
          </Suspense>
        </div>
      );
    }

    if (location.pathname === '/login' || location.pathname === '/master-admin' || location.pathname === '/admin') {
      return (
        <ErrorBoundary>
          <Suspense fallback={<DashboardLoader />}>
            <LoginScreen onLogin={handleLogin} kioskStationId={isKioskMode ? stationIdFromStorage : null} />
          </Suspense>
        </ErrorBoundary>
      );
    }
    return (
      <ErrorBoundary>
        <Suspense fallback={<DashboardLoader />}>
          <LoginScreen onLogin={handleLogin} kioskStationId={isKioskMode ? stationIdFromStorage : null} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (showDeletionPrompt && deletionPromptUserId) {
    return (
      <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b' }}>Lade Kündigungs-Abfrage...</div>}>
        <ContractEndPrompt
          userId={deletionPromptUserId}
          isHome={deletionPromptIsHome}
          onDecisionComplete={(uid, home) => {
            setShowDeletionPrompt(false);
            setDeletionPromptUserId(null);
            handleLogin(uid, home);
          }}
          onCancel={() => {
            setShowDeletionPrompt(false);
            setDeletionPromptUserId(null);
          }}
        />
      </Suspense>
    );
  }

  // 2.5 MASTER ADMIN PORTAL — nur via is_master_admin DB-Flag
  if (isMasterAdminSession) {
    return (
      <>
        <Suspense fallback={<DashboardLoader />}>
          <MasterAdminDashboard onLogout={handleLogout} currentUser={{ ...user, is_master_admin: true }} />
        </Suspense>
        {showSchoolOnboardingModal && (
          <SchoolSelfOnboardingModal
            onClose={() => setShowSchoolOnboardingModal(false)}
            onSuccess={() => {
              setShowSchoolOnboardingModal(false);
              window.location.reload();
            }}
          />
        )}
      </>
    );
  }

  if (loading || !user) {
    const debugError = typeof window !== 'undefined' ? (window as any).fetchDashboardDataError : null;
    const debugStack = typeof window !== 'undefined' ? (window as any).fetchDashboardDataStack : null;

    return (
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        background: '#09090b', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        flexDirection: 'column', 
        gap: '16px',
        padding: '20px',
        boxSizing: 'border-box'
      }}>
        {loading && (
          <div className="animate-spin" style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid rgba(255, 255, 255, 0.05)', 
            borderTopColor: '#facc15', 
            borderRadius: '50%',
            marginBottom: '8px'
          }}></div>
        )}
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#a1a1aa', letterSpacing: '0.05em', textAlign: 'center' }}>
          {loading ? 'Sitzung wird wiederhergestellt...' : 'Sitzungs-Daten konnten nicht geladen werden.'}
        </div>

        {debugError && (
          <div style={{ 
            marginTop: '20px', 
            color: '#ef4444', 
            fontSize: '12px', 
            textAlign: 'center', 
            maxWidth: '100%', 
            wordBreak: 'break-all',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            padding: '12px',
            borderRadius: '8px'
          }}>
            <strong>Fehlerdetails:</strong> {typeof debugError === 'object' ? (debugError?.message || JSON.stringify(debugError)) : String(debugError)}
            {debugStack && (
              <pre style={{ 
                marginTop: '10px', 
                fontSize: '10px', 
                color: '#f87171', 
                textAlign: 'left', 
                whiteSpace: 'pre-wrap', 
                maxHeight: '150px', 
                overflowY: 'auto'
              }}>{debugStack}</pre>
            )}
          </div>
        )}

        {/* Exit Hatch: allow manual reset if stuck or database is unreachable */}
        {(!loading || debugError) && (
          <button
            type="button"
            role="button"
            tabIndex={0}
            aria-label="Zurück zum Login und neu anmelden"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.currentTarget.click();
              }
            }}
            onClick={async () => {
              try {
                await supabase.auth.signOut();
              } catch (e) {}
              try {
                sessionStorage.clear();
              } catch (e) {}
              try {
                localStorage.removeItem('groovelab_user_id');
                localStorage.removeItem('groovelab_current_user_id');
                localStorage.removeItem('campus_active_user_id');
                localStorage.removeItem('groovelab_cached_user');
                localStorage.removeItem('groovelab_location_mode');
                localStorage.removeItem('gl_active_session_lease_id');
                localStorage.removeItem('gl_global_device_key');
              } catch (e) {}
              setLoggedInUserId(null);
              setUser(null);
              setLoading(false);
              window.location.href = '/';
            }}
            style={{
              marginTop: '20px',
              background: '#facc15',
              border: 'none',
              color: '#0f172a',
              fontSize: '14px',
              fontWeight: 700,
              padding: '12px 28px',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              minHeight: '44px',
              boxShadow: '0 4px 14px rgba(250, 204, 21, 0.3)',
              transition: 'all 0.15s ease-in-out',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
              outline: 'none'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#eab308';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#facc15';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(250, 204, 21, 0.6)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(250, 204, 21, 0.3)';
            }}
          >
            Zurück zum Login (Neu anmelden)
          </button>
        )}
      </div>
    );
  }

  // 2.5b SECRETARY DASHBOARD BYPASS
  const currentWorkspace = activeWorkspace || (typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_active_workspace') : null);
  if ((user.role?.toLowerCase() === 'secretary' || user.role?.toLowerCase() === 'admin') && currentWorkspace !== 'teacher') {
    return (
      <LegalConsentGate user={user}>
        <ErrorBoundary>
          {isGhostParam && (
            <GhostSupportCapsule 
              schoolName={user?.schools?.name || (Array.isArray(user?.schools) ? user.schools[0]?.name : undefined)} 
              currentRole={user?.role}
              onRoleChange={handleSwitchActiveRole}
            />
          )}
          <Suspense fallback={<DashboardLoader />}>
            <SecretaryDashboard 
              schoolId={user?.school_id || (Array.isArray(user?.schools) ? user.schools[0]?.id : user?.schools?.id) || ''} 
              userId={user?.id || ''} 
              userRole={user?.role || 'secretary'}
              userRoles={user?.roles || []}
              onLogout={handleLogout} 
              onRoleSwitched={handleSwitchActiveRole}
              activePlatform={activePlatform}
            />
          </Suspense>
        </ErrorBoundary>
      </LegalConsentGate>
    );
  }

  // 2.5c INACTIVE STUDENT MODULE ACCESS SECURITY GUARD
  if (user.role?.toLowerCase() === 'student') {
    const isCampusActive = user.is_campus_active === true;
    const isGroovelabActive = user.is_groovelab_active === true;

    // Case 1: Student has NO active modules -> Strictly block entry to GrooveLab & Campus dashboards, force QRLandingPage!
    if (!isCampusActive && !isGroovelabActive) {
      const tokenToUse = user.qr_token || user.ausweis_nummer || user.id;
      return (
        <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b' }}>Lade Campus Pass...</div>}>
          <QRLandingPage token={tokenToUse} />
        </Suspense>
      );
    }
  }

  // 2.6 DEACTIVATED / PAUSED SCHOOL CHECK (Students possess Didactic Immunity)
  if (isSchoolPaused && user?.role?.toLowerCase() !== 'student') {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#09090b',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        padding: '24px',
        textAlign: 'center',
        fontFamily: '"Outfit", "Inter", sans-serif',
        zIndex: 9999
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '48px 32px',
          borderRadius: '32px',
          maxWidth: '480px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '24px',
            background: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            <Clock size={40} color="#ef4444" className="animate-pulse" />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0 0 16px 0', letterSpacing: '-0.02em', color: '#f8fafc' }}>
            Zugang pausiert
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', margin: '0 0 32px 0' }}>
            Diese Schule wurde vorübergehend deaktiviert. Schüler- und Lehrerprofile sind für die Dauer der Deaktivierung nicht nutzbar und es können keine Daten geladen oder gesendet werden.
          </p>
          <button
            type="button"
            onClick={() => handleLogout(false, false)}
            style={{
              padding: '14px 28px',
              borderRadius: '14px',
              background: '#ffffff',
              color: '#09090b',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(255,255,255,0.1)',
              transition: 'all 0.2s'
            }}
          >
            Abmelden
          </button>
        </div>
      </div>
    );
  }

  // No gate matched: allow App to render main authenticated dashboard stage
  return null;
}

export const CampusStartupGates: React.FC<CampusStartupGatesProps> = (props) => {
  return renderCampusStartupGates(props);
};

export default CampusStartupGates;
