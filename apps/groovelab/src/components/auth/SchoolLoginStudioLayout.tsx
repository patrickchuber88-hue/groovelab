import React, { useState, useRef, useEffect } from 'react';
import { 
  Music, ArrowLeft, Fingerprint, KeyRound, RotateCw, 
  Camera, CameraOff, X, Check, Pencil, QrCode, Tablet, GraduationCap, Lock, Delete, Users, ShieldCheck, Upload,
  Compass, CreditCard
} from 'lucide-react';
import { CampusLoginSponsorBadge } from '../ui/CampusLoginSponsorBadge';
import { TriAuthMethod } from './TriAuthGatewayBar';
import { CampusIdPinAuthCard } from './CampusIdPinAuthCard';
import { stopAllCameras } from '../../utils/cameraKillSwitch';
import { resetTenantAndNavigateToSelection } from '../../utils/tenantUrlHelper';

export interface SchoolLoginStudioLayoutProps {
  isGroovelabKiosk: boolean;
  onTogglePlatform?: (isGroovelab: boolean) => void;
  onFileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetToSchoolSelection?: () => void;
  schoolData: any;
  schoolName: string;
  logoError: boolean;
  setLogoError: (val: boolean) => void;
  setLogoClicks: React.Dispatch<React.SetStateAction<number>>;
  setShowAdminModal: (val: boolean) => void;

  // Tri-Auth state & handlers
  activeMethod: TriAuthMethod;
  onSelectMethod: (method: TriAuthMethod) => void;

  // Biometrics / Passkey state
  biometricsAvailable: boolean;
  biometricLoading: boolean;
  biometricError: string | null;
  selectedBiometricUser: any;
  setSelectedBiometricUser: (user: any) => void;
  scopedBiometricProfiles: any[];
  handleTriggerBiometricLogin: (userId?: string) => Promise<void>;
  handleRemoveBiometricUser: (userId: string, e: React.MouseEvent) => void;

  // Family Profiles (Netflix-Style)
  scopedFamilyProfiles: any[];
  isManagingProfiles: boolean;
  setIsManagingProfiles: React.Dispatch<React.SetStateAction<boolean>>;
  handleFamilyProfileSelect: (p: any) => Promise<void>;
  savedFamilyProfiles: any[];
  setSavedFamilyProfiles: React.Dispatch<React.SetStateAction<any[]>>;
  resolveCampusStudentAvatar: (user: any) => string;

  // Camera & Scanner state
  isCameraActive: boolean;
  setIsCameraActive: (val: boolean) => void;
  cameraHasError: boolean;
  setCameraHasError: (val: boolean) => void;
  facingMode: 'user' | 'environment';
  setFacingMode: React.Dispatch<React.SetStateAction<'user' | 'environment'>>;
  loading: boolean;
  handleScan: (val: string) => Promise<void>;
  setError: (err: string | null) => void;
  scanSuccess?: boolean;
  ScannerComponent: React.ComponentType<{
    onScan: (val: string) => void;
    onError: (err: any) => void;
    paused?: boolean;
    facingMode: 'user' | 'environment';
  }>;
  setShowPermissionHelp?: (val: boolean) => void;
  isIOS?: boolean;
  isStandalone?: boolean;

  // PIN Login state
  pinInput: string;
  setPinInput: (val: string) => void;
  handlePinLogin: (pin: string) => Promise<void>;
  pinLockoutSeconds: number;
  loginConsentAccepted?: boolean;
  setLoginConsentAccepted?: (val: boolean) => void;

  // Legal Modal
  setLegalModalTab: (tab: 'privacy' | 'terms' | 'cancellation' | 'impressum' | 'accessibility' | 'child_protection') => void;

  // Kiosk metadata
  effectiveStationId?: string | null;

  // Optional Developer Bypass Slot for localhost
  devBypassSlot?: React.ReactNode;
}

/**
 * 🏛️ SchoolLoginStudioLayout (0,1% Enterprise Goldstandard Architecture)
 * 
 * Bounded Context: Core Authentication / Identity Gateway (SEC-126)
 * 
 * Merkmale & Garantien:
 * 1. Volle Kartenbreite für die Kamera (ca. 372x372 px) – ergonomisch, immersiv & großzügig.
 * 2. Zero-Redundancy: Redundante Buttons unter der Karte restlos entfernt. Die TriAuth-Leiste steuert 100% der Modi.
 * 3. Universeller Login: Schulleitung, Lehrkräfte und Schüler nutzen dieselben 3 Standardmethoden (QR, PIN, Passkey).
 * 4. Master-Admin Secret Trigger: 5 Klicks auf den Hintergrund öffnen diskret das Admin-Modal.
 * 5. Fest verankerter, ruhiger 5-Säulen Legal-Footer.
 */
export const SchoolLoginStudioLayout: React.FC<SchoolLoginStudioLayoutProps> = ({
  isGroovelabKiosk,
  onTogglePlatform,
  onFileUpload,
  schoolData,
  schoolName,
  logoError,
  setLogoError,
  setLogoClicks,
  setShowAdminModal,
  activeMethod,
  onSelectMethod,
  biometricsAvailable,
  biometricLoading,
  biometricError,
  selectedBiometricUser,
  setSelectedBiometricUser,
  scopedBiometricProfiles,
  handleTriggerBiometricLogin,
  handleRemoveBiometricUser,
  scopedFamilyProfiles,
  isManagingProfiles,
  setIsManagingProfiles,
  handleFamilyProfileSelect,
  savedFamilyProfiles,
  setSavedFamilyProfiles,
  resolveCampusStudentAvatar,
  isCameraActive,
  setIsCameraActive,
  cameraHasError,
  setCameraHasError,
  facingMode,
  setFacingMode,
  loading,
  handleScan,
  setError,
  scanSuccess,
  ScannerComponent,
  setShowPermissionHelp,
  isIOS,
  isStandalone,
  pinInput,
  setPinInput,
  handlePinLogin,
  pinLockoutSeconds,
  loginConsentAccepted,
  setLoginConsentAccepted,
  setLegalModalTab,
  effectiveStationId,
  devBypassSlot,
  onResetToSchoolSelection
}) => {
  const handleSchoolSelectionClick = () => {
    if (onResetToSchoolSelection) {
      onResetToSchoolSelection();
    } else {
      resetTenantAndNavigateToSelection();
    }
  };

  // 🏛️ Sovereign Brand Tokens (Axiom 1 & 9: Campus 100% Emerald Green, GrooveLab 100% Warm Amber)
  const brandPrimaryColor = isGroovelabKiosk ? '#facc15' : '#16a34a';
  const brandAccentColor = isGroovelabKiosk ? '#facc15' : '#4ade80';
  const brandTextColor = isGroovelabKiosk ? '#0f172a' : '#ffffff';
  const brandActiveTabBg = isGroovelabKiosk ? '#facc15' : '#16a34a';
  const brandActiveTabColor = isGroovelabKiosk ? '#0f172a' : '#ffffff';
  const brandInactiveTabIcon = isGroovelabKiosk ? '#facc15' : '#4ade80';
  const brandCameraBorder = isGroovelabKiosk ? '1.5px solid #facc15' : '1.5px solid rgba(74, 222, 128, 0.45)';
  const brandLaserGlow = isGroovelabKiosk ? 'rgba(250, 204, 21, 0.25)' : 'rgba(74, 222, 128, 0.25)';
  const brandTriAuthBorder = isGroovelabKiosk ? '1px solid rgba(250, 204, 21, 0.45)' : '1px solid rgba(74, 222, 128, 0.25)';
  const brandTriAuthBg = isGroovelabKiosk 
    ? 'rgba(15, 23, 42, 0.90)' 
    : 'rgba(0, 0, 0, 0.38)';

  // 🏫 Dynamische Schulnummer für Ausweis-Prefix (Default: '001')
  const currentSchoolNum = schoolData?.school_number
    ? String(schoolData.school_number).padStart(3, '0')
    : '001';

  // 🛡️ Master Admin Secret Access: 5 Klicks auf den Hintergrund aktivieren das Admin-Modal
  const [bgClickCount, setBgClickCount] = useState(0);
  const bgClickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Nur Klicks direkt auf den Hintergrund erfassen (nicht auf interaktive Kinder)
    if (e.target !== e.currentTarget) return;

    setBgClickCount((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setShowAdminModal(true);
        if (bgClickTimerRef.current) clearTimeout(bgClickTimerRef.current);
        return 0;
      }
      return next;
    });

    if (bgClickTimerRef.current) clearTimeout(bgClickTimerRef.current);
    bgClickTimerRef.current = setTimeout(() => {
      setBgClickCount(0);
    }, 3000);
  };

  return (
    <div 
      className="login-studio-container pwa-scroll-container pwa-standalone-screen"
      onClick={handleCanvasClick}
      style={{
        position: 'relative', width: '100%', minHeight: '100vh',
        height: '100dvh', maxHeight: '100dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
        background: '#0a361c',
        color: isGroovelabKiosk ? '#062413' : '#ffffff', boxSizing: 'border-box',
        padding: '28px 16px 20px 16px',
        fontFamily: '"Plus Jakarta Sans", "Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        transition: 'color 0.4s ease',
        overflowX: 'hidden'
      }}
    >
      {/* ─── DUAL-CANVAS GPU CROSS-FADE BACKGROUND ENGINE (0,1% FLUID STAGE) ─── */}
      <div 
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          background: '#0a361c',
          opacity: isGroovelabKiosk ? 0 : 1,
          transition: 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: 'none', zIndex: 0
        }} 
      />
      <div 
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          background: '#ca8a04',
          opacity: isGroovelabKiosk ? 1 : 0,
          transition: 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: 'none', zIndex: 0
        }} 
      />

      {/* ─── MIKROFEINE KREIDESTAUB-TEXTUR (ATMOSPHÄRISCHES TAFELGRÜN) ─── */}
      <div 
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, opacity: 0.025, pointerEvents: 'none', zIndex: 1,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")'
        }} 
      />

      {/* ─── SCHUL-LOGO, TITEL & UNTERTITEL (0,1% BRAND GOLDSTANDARD) ─── */}
      <div 
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
          gap: '4px', width: '100%', maxWidth: '460px', zIndex: 3, marginBottom: '14px'
        }}
      >
        <div 
          style={{
            width: '62px', height: '62px', borderRadius: '20px',
            background: (schoolData?.logo_url && !logoError)
              ? '#ffffff'
              : (isGroovelabKiosk 
                  ? 'rgba(250, 204, 21, 0.20)' 
                  : 'rgba(255, 255, 255, 0.08)'),
            border: (schoolData?.logo_url && !logoError)
              ? '1px solid rgba(255, 255, 255, 0.5)'
              : (isGroovelabKiosk ? '1px solid rgba(250, 204, 21, 0.45)' : '1px solid rgba(255, 255, 255, 0.15)'),
            boxShadow: isGroovelabKiosk
              ? 'inset 0 1px 1px 0 rgba(250, 204, 21, 0.5), 0 10px 24px rgba(0, 0, 0, 0.25)'
              : 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.25), 0 8px 20px rgba(0, 0, 0, 0.25)',
            backdropFilter: isGroovelabKiosk ? 'blur(20px) saturate(180%)' : 'blur(16px)', 
            WebkitBackdropFilter: isGroovelabKiosk ? 'blur(20px) saturate(180%)' : 'blur(16px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: '4px',
            padding: (schoolData?.logo_url && !logoError) ? '7px' : '0',
            boxSizing: 'border-box'
          }}
        >
          {schoolData?.logo_url && !logoError ? (
            <img 
              src={schoolData.logo_url} 
              alt={schoolName || 'Schul-Logo'} 
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.includes('musaek_logo.png')) {
                  target.src = '/musaek_logo.png';
                } else {
                  setLogoError(true);
                }
              }}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            />
          ) : (
            <Music size={28} color={isGroovelabKiosk ? '#facc15' : '#ffffff'} />
          )}
        </div>

        {/* 0,1% Brand Goldstandard: Schulinstitution als Primär-Identität */}
        <h1 
          onClick={() => setLogoClicks(prev => prev + 1)}
          style={{ 
            fontSize: '27px', fontWeight: 850, 
            color: isGroovelabKiosk ? '#0f172a' : '#ffffff', 
            margin: '0 0 2px 0', letterSpacing: '-0.03em', lineHeight: 1.2, textAlign: 'center',
            textShadow: isGroovelabKiosk ? '0 1px 2px rgba(255, 255, 255, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.4)',
            cursor: 'pointer', userSelect: 'none',
            transition: 'color 0.35s ease, text-shadow 0.35s ease'
          }}
        >
          {schoolName || (isGroovelabKiosk ? 'GrooveLab' : 'Campus Musikschule')}
        </h1>

        {/* Subline: Portal-Modus dezent und elegant mit tiefem Kontrast auf Gelb */}
        <div 
          style={{
            fontSize: '14.5px', fontWeight: 800, 
            color: isGroovelabKiosk ? '#713f12' : '#a7f3d0',
            letterSpacing: '0.02em', textAlign: 'center',
            opacity: 0.95,
            transition: 'color 0.35s ease'
          }}
        >
          {isGroovelabKiosk ? 'Groovelab-Login' : 'Campus-Login'}
        </div>

        {/* 🧭 Schulauswahl-Shortcut (Subdomain-Trapping Schutz & Apex-Return) */}
        <button
          type="button"
          onClick={handleSchoolSelectionClick}
          role="button"
          tabIndex={0}
          aria-label="Andere Musikschule auswählen"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSchoolSelectionClick();
            }
          }}
          style={{
            marginTop: '8px',
            background: isGroovelabKiosk ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.10)',
            border: isGroovelabKiosk ? '1px solid rgba(113, 63, 18, 0.25)' : '1px solid rgba(255, 255, 255, 0.20)',
            borderRadius: '9999px',
            padding: '5px 14px',
            color: isGroovelabKiosk ? '#713f12' : '#ffffff',
            fontSize: '11.5px',
            fontWeight: 800,
            letterSpacing: '0.01em',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            transition: 'all 0.2s ease',
            minHeight: '30px',
            userSelect: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isGroovelabKiosk ? 'rgba(255, 255, 255, 0.70)' : 'rgba(255, 255, 255, 0.20)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isGroovelabKiosk ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.10)';
          }}
        >
          <Compass size={13} strokeWidth={2.4} aria-hidden="true" />
          <span>Andere Musikschule auswählen</span>
        </button>
      </div>

      {/* ─── NETFLIX-STYLE MULTI-PROFIL SCHNELL-LOGIN ("WER ÜBT HEUTE?") ─── */}
      {scopedFamilyProfiles.length > 0 && (
        <div 
          style={{
            width: '100%', maxWidth: '460px', marginBottom: '12px', padding: '10px 14px', borderRadius: '22px',
            background: isGroovelabKiosk 
              ? 'rgba(15, 23, 42, 0.86)'
              : 'rgba(0, 0, 0, 0.34)',
            border: isGroovelabKiosk ? '1px solid rgba(250, 204, 21, 0.35)' : '1px solid rgba(74, 222, 128, 0.25)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            display: 'flex', flexDirection: 'column', gap: '8px', boxSizing: 'border-box', zIndex: 3
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ 
              fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', 
              color: isGroovelabKiosk ? '#fde68a' : '#a7f3d0', display: 'flex', alignItems: 'center', gap: '5px' 
            }}>
              <Users size={13} color={isGroovelabKiosk ? '#facc15' : '#4ade80'} />
              Wer übt heute? ({scopedFamilyProfiles.length})
            </span>
            <button
              type="button"
              onClick={() => setIsManagingProfiles(!isManagingProfiles)}
              style={{
                background: 'none', border: 'none',
                color: isManagingProfiles ? '#ef4444' : (isGroovelabKiosk ? '#facc15' : 'rgba(255, 255, 255, 0.75)'),
                fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px'
              }}
            >
              {isManagingProfiles ? <><Check size={11} /> Fertig</> : <><Pencil size={11} /> Verwalten</>}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '4px 0' }}>
            {scopedFamilyProfiles.map((p) => {
              const avatarSrc = resolveCampusStudentAvatar(p);
              return (
                <div
                  key={p.id}
                  onClick={() => handleFamilyProfileSelect(p)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Als ${p.first_name} anmelden`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleFamilyProfileSelect(p);
                    }
                  }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    cursor: isManagingProfiles ? 'default' : 'pointer', position: 'relative', outline: 'none', minWidth: '56px',
                    transition: 'transform 0.15s ease'
                  }}
                  onMouseEnter={(e) => { if (!isManagingProfiles) e.currentTarget.style.transform = 'scale(1.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
                >
                  {isManagingProfiles && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const updated = savedFamilyProfiles.filter(item => item.id !== p.id);
                        setSavedFamilyProfiles(updated);
                        localStorage.setItem('groovelab_local_profiles', JSON.stringify(updated));
                        localStorage.setItem('campus_family_profiles', JSON.stringify(updated));
                      }}
                      aria-label="Profil entfernen"
                      style={{
                        position: 'absolute', top: '-4px', right: '2px', width: '18px', height: '18px',
                        borderRadius: '50%', background: '#ef4444', border: 'none', color: '#ffffff',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
                      }}
                    >
                      <X size={10} strokeWidth={3} />
                    </button>
                  )}
                  <div 
                    style={{
                      width: '46px', height: '46px', borderRadius: '15px', overflow: 'hidden',
                      border: isGroovelabKiosk ? '2px solid rgba(250, 204, 21, 0.5)' : '2px solid rgba(74, 222, 128, 0.45)', 
                      background: '#0c0f12', boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                    }}
                  >
                    <img 
                      src={avatarSrc} 
                      alt={p.first_name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#ffffff', marginTop: '4px', textAlign: 'center', maxWidth: '58px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.first_name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── DREI-SÄULEN TRIAUTH BAR (QR · PIN · PASSKEY) – SINGLE SOURCE OF TRUTH ─── */}
      <div 
        role="tablist"
        aria-label="Anmeldemethode wählen"
        style={{
          display: 'inline-flex', padding: '4px', borderRadius: '100px',
          background: brandTriAuthBg,
          border: brandTriAuthBorder,
          backdropFilter: 'blur(20px)', 
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: isGroovelabKiosk 
            ? 'inset 0 1px 1px 0 rgba(250, 204, 21, 0.5), 0 10px 28px rgba(0, 0, 0, 0.35)' 
            : 'inset 0 1px 0 rgba(74, 222, 128, 0.25), 0 8px 24px rgba(0, 0, 0, 0.3)', 
          marginBottom: '12px',
          maxWidth: '460px', width: '100%', boxSizing: 'border-box', zIndex: 3,
          transition: 'background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease'
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeMethod === 'qr'}
          onClick={() => {
            onSelectMethod('qr');
          }}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '9px 12px', borderRadius: '100px', border: 'none',
            background: activeMethod === 'qr' ? brandActiveTabBg : 'transparent',
            color: activeMethod === 'qr' ? brandActiveTabColor : 'rgba(255, 255, 255, 0.75)',
            fontWeight: 800, fontSize: '13.5px', cursor: 'pointer',
            boxShadow: activeMethod === 'qr' ? (isGroovelabKiosk ? '0 2px 8px rgba(250, 204, 21, 0.35)' : '0 2px 8px rgba(22, 163, 74, 0.35)') : 'none', 
            transition: 'all 0.18s ease'
          }}
        >
          <QrCode size={16} color={activeMethod === 'qr' ? brandActiveTabColor : brandInactiveTabIcon} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
            <span>QR-Ausweis</span>
            <span style={{ fontSize: '10px', fontWeight: 600, opacity: 0.8 }}>Kamera / Foto</span>
          </div>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeMethod === 'pin'}
          onClick={() => {
            onSelectMethod('pin');
            setIsCameraActive(false);
          }}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '9px 12px', borderRadius: '100px', border: 'none',
            background: activeMethod === 'pin' ? brandActiveTabBg : 'transparent',
            color: activeMethod === 'pin' ? brandActiveTabColor : 'rgba(255, 255, 255, 0.75)',
            fontWeight: 800, fontSize: '13.5px', cursor: 'pointer',
            boxShadow: activeMethod === 'pin' ? (isGroovelabKiosk ? '0 2px 8px rgba(250, 204, 21, 0.35)' : '0 2px 8px rgba(22, 163, 74, 0.35)') : 'none', 
            transition: 'all 0.18s ease'
          }}
        >
          <CreditCard size={16} color={activeMethod === 'pin' ? brandActiveTabColor : brandInactiveTabIcon} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
            <span>Ausweis-ID</span>
            <span style={{ fontSize: '10px', fontWeight: 600, opacity: 0.8 }}>Nummer & PIN</span>
          </div>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeMethod === 'passkey'}
          onClick={() => {
            onSelectMethod('passkey');
            setIsCameraActive(false);
            if (scopedBiometricProfiles.length > 0) {
              handleTriggerBiometricLogin();
            }
          }}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '9px 12px', borderRadius: '100px', border: 'none',
            background: activeMethod === 'passkey' ? brandActiveTabBg : 'transparent',
            color: activeMethod === 'passkey' ? brandActiveTabColor : 'rgba(255, 255, 255, 0.75)',
            fontWeight: 800, fontSize: '13.5px', cursor: 'pointer',
            boxShadow: activeMethod === 'passkey' ? (isGroovelabKiosk ? '0 2px 8px rgba(250, 204, 21, 0.35)' : '0 2px 8px rgba(22, 163, 74, 0.35)') : 'none', 
            transition: 'all 0.18s ease'
          }}
        >
          <Fingerprint size={16} color={activeMethod === 'passkey' ? brandActiveTabColor : brandInactiveTabIcon} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              Passkey
              {scopedBiometricProfiles.length > 0 && <span style={{ color: '#34a853', fontSize: '10px' }}>✓</span>}
            </span>
            <span style={{ fontSize: '10px', fontWeight: 600, opacity: 0.8 }}>
              {scopedBiometricProfiles.length > 0 ? 'Bereit' : 'Face / Touch ID'}
            </span>
          </div>
        </button>
      </div>

      {/* ─── DIE ZENTRALE LIQUID FROSTED-GLASS HAUPTKARTE (0,1% LUMINÖSES CRYSTAL GLASS) ─── */}
      <div 
        style={{
          width: '100%', maxWidth: '460px',
          background: isGroovelabKiosk 
            ? 'rgba(15, 23, 42, 0.88)' 
            : 'rgba(255, 255, 255, 0.075)',
          borderRadius: '40px', padding: '20px',
          backdropFilter: isGroovelabKiosk 
            ? 'blur(36px) saturate(200%) contrast(110%)' 
            : 'blur(28px)', 
          WebkitBackdropFilter: isGroovelabKiosk 
            ? 'blur(36px) saturate(200%) contrast(110%)' 
            : 'blur(28px)',
          border: isGroovelabKiosk ? '1px solid rgba(250, 204, 21, 0.45)' : '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: isGroovelabKiosk 
            ? 'inset 0 1.5px 1.5px 0 rgba(250, 204, 21, 0.65), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.35), 0 32px 90px rgba(113, 63, 18, 0.38), 0 12px 32px rgba(0, 0, 0, 0.35)' 
            : 'inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 30px 80px rgba(0, 0, 0, 0.35)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative',
          boxSizing: 'border-box', zIndex: 3, 
          transition: 'background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease'
        }}
      >
        {/* ─── TAB 1: QR-AUSWEIS KAMERA-SCANNER (VOLLE KARTENBREITE, CA. 372 x 372 px) ─── */}
        {activeMethod === 'qr' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            
            {/* Großes Apple-Sight Kamera-Sichtfeld (100% Breite der Innenkarte) */}
            <div 
              style={{
                width: '100%',
                aspectRatio: '1 / 1',
                borderRadius: '30px',
                overflow: 'hidden',
                background: '#0c0f12',
                position: 'relative',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.1)',
                border: brandCameraBorder,
                padding: '3px',
                boxSizing: 'border-box',
                transition: 'border 0.35s ease'
              }}
            >
              <div 
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '26px',
                  overflow: 'hidden',
                  position: 'relative',
                  background: '#0c0f12'
                }}
              >
                {/* LIVE Status Badge (Only when camera active) */}
                {isCameraActive && !cameraHasError && (
                  <div 
                    style={{
                      position: 'absolute', top: '10px', left: '10px', zIndex: 15,
                      background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '100px', padding: '3px 10px',
                      display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9.5px', fontWeight: 800,
                      color: '#ffffff', pointerEvents: 'none'
                    }}
                  >
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: brandAccentColor }} />
                    <span>LIVE</span>
                  </div>
                )}

                {/* Camera Controls (Flip & Stop) (Only when camera active) */}
                {isCameraActive && !cameraHasError && (
                  <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 15, display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                      aria-label="Kamera wechseln"
                      title="Kamera wechseln"
                      style={{
                        width: '36px', height: '36px',
                        borderRadius: '50%', background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#ffffff', transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)'}
                    >
                      <RotateCw size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsCameraActive(false)}
                      aria-label="Kamera stoppen"
                      title="Kamera stoppen"
                      style={{
                        width: '36px', height: '36px',
                        borderRadius: '50%', background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#ffffff', transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)'}
                    >
                      <CameraOff size={15} />
                    </button>
                  </div>
                )}

                {/* Scan Success Flash */}
                {scanSuccess && (
                  <div 
                    style={{
                      position: 'absolute', inset: 0,
                      background: isGroovelabKiosk ? 'rgba(250, 204, 21, 0.45)' : 'rgba(74, 222, 128, 0.45)',
                      zIndex: 20, pointerEvents: 'none'
                    }} 
                  />
                )}

                {isCameraActive && !cameraHasError ? (
                  <>
                    <ScannerComponent
                      onScan={(val) => {
                        handleScan(val);
                      }}
                      onError={(err: any) => {
                        console.error('[StudioScanner] Camera error:', err);
                        setCameraHasError(true);
                        setError(`Kamera-Fehler: ${err?.message || String(err || '')}`);
                      }}
                      paused={loading}
                      facingMode={facingMode}
                    />

                    {/* Apple-Sight Corner Reticles (Ruhiges, präzises Zielfeld ohne hektischen Laser) */}
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
                      <div style={{ position: 'absolute', top: '54px', left: '22px', width: '28px', height: '28px', borderTop: `3.5px solid ${brandAccentColor}`, borderLeft: `3.5px solid ${brandAccentColor}`, borderTopLeftRadius: '10px' }} />
                      <div style={{ position: 'absolute', top: '54px', right: '22px', width: '28px', height: '28px', borderTop: `3.5px solid ${brandAccentColor}`, borderRight: `3.5px solid ${brandAccentColor}`, borderTopRightRadius: '10px' }} />
                      <div style={{ position: 'absolute', bottom: '22px', left: '22px', width: '28px', height: '28px', borderBottom: `3.5px solid ${brandAccentColor}`, borderLeft: `3.5px solid ${brandAccentColor}`, borderBottomLeftRadius: '10px' }} />
                      <div style={{ position: 'absolute', bottom: '22px', right: '22px', width: '28px', height: '28px', borderBottom: `3.5px solid ${brandAccentColor}`, borderRight: `3.5px solid ${brandAccentColor}`, borderBottomRightRadius: '10px' }} />
                    </div>
                  </>
                ) : (
                  <div 
                    style={{
                      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#ffffff',
                      padding: '24px', textAlign: 'center', boxSizing: 'border-box'
                    }}
                  >
                    {cameraHasError ? (
                      <>
                        <CameraOff size={32} color="#ef4444" />
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#fca5a5' }}>
                          Kamerazugriff blockiert
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.7)', maxWidth: '240px', lineHeight: 1.35 }}>
                          Bitte erlaube den Kamerazugriff in deinen Browser-Einstellungen.
                        </div>
                        {isIOS && isStandalone ? (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                            <button
                              type="button"
                              onClick={() => window.open(window.location.href, '_blank')}
                              style={{
                                padding: '8px 14px', borderRadius: '10px', border: 'none',
                                background: brandPrimaryColor, color: brandTextColor, fontWeight: 800, fontSize: '11px', cursor: 'pointer'
                              }}
                            >
                              In Safari öffnen
                            </button>
                            {setShowPermissionHelp && (
                              <button
                                type="button"
                                onClick={() => setShowPermissionHelp(true)}
                                style={{
                                  padding: '8px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)',
                                  background: 'transparent', color: '#ffffff', fontWeight: 700, fontSize: '11px', cursor: 'pointer'
                                }}
                              >
                                Hilfe
                              </button>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '240px', marginTop: '6px' }}>
                            {/* 1-Tap Umschaltung zur PIN-Eingabe */}
                            <button
                              type="button"
                              onClick={() => onSelectMethod('pin')}
                              style={{
                                padding: '10px 16px', borderRadius: '12px', border: 'none',
                                background: brandPrimaryColor, color: brandTextColor, fontWeight: 800, fontSize: '12px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                              }}
                            >
                              <KeyRound size={15} />
                              <span>Mit Ausweis-Code / PIN anmelden</span>
                            </button>

                            {/* OS-Foto-Bypass: Öffnet die native iPhone/Android Kamera über System-Picker */}
                            {onFileUpload && (
                              <label
                                style={{
                                  padding: '8px 14px', borderRadius: '10px',
                                  border: '1px solid rgba(255,255,255,0.25)',
                                  background: 'rgba(255,255,255,0.10)', color: '#ffffff',
                                  fontWeight: 700, fontSize: '11px', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                                }}
                              >
                                <Camera size={13} />
                                <span>Ausweis fotografieren</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  onChange={onFileUpload}
                                  style={{ display: 'none' }}
                                />
                              </label>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setCameraHasError(false);
                                setIsCameraActive(true);
                              }}
                              style={{
                                padding: '6px 12px', borderRadius: '8px', border: 'none',
                                background: 'transparent', color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: '11px', cursor: 'pointer'
                              }}
                            >
                              Kamera erneut versuchen
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div 
                          style={{
                            width: '64px', height: '64px', borderRadius: '20px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: '4px',
                            boxShadow: isGroovelabKiosk 
                              ? '0 8px 24px rgba(250, 204, 21, 0.18)' 
                              : '0 8px 24px rgba(74, 222, 128, 0.18)'
                          }}
                        >
                          <Camera size={30} color={brandPrimaryColor} />
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
                          QR-Ausweis scannen
                        </div>
                        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.72)', maxWidth: '240px', lineHeight: 1.35 }}>
                          Halte deinen Ausweis oder QR-Code vor die Kamera, um dich anzumelden
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCameraHasError(false);
                            setIsCameraActive(true);
                          }}
                          style={{
                            marginTop: '8px',
                            padding: '11px 26px',
                            borderRadius: '100px',
                            border: 'none',
                            background: brandPrimaryColor,
                            color: brandTextColor,
                            fontWeight: 800,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: isGroovelabKiosk 
                              ? '0 4px 16px rgba(250, 204, 21, 0.35)' 
                              : '0 4px 16px rgba(34, 197, 94, 0.35)',
                            transition: 'transform 0.15s ease, filter 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.03)';
                            e.currentTarget.style.filter = 'brightness(1.06)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.filter = 'none';
                          }}
                        >
                          <Camera size={16} color={brandTextColor} strokeWidth={2.5} />
                          <span>Kamera aktivieren</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={{
              fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.75)',
              margin: '2px 0 0 0', textAlign: 'center', lineHeight: 1.2,
              whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}>
              <Lock size={12} strokeWidth={2} style={{ opacity: 0.85 }} />
              <span>Die Kamera- &amp; Bildverarbeitung erfolgt ausschließlich lokal auf Ihrem Gerät.</span>
            </div>

            {onFileUpload && (
              <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'center' }}>
                <label 
                  htmlFor="qr-photo-upload"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '6px 14px', borderRadius: '100px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    color: isGroovelabKiosk ? '#fde68a' : '#e2e8f0',
                    fontSize: '11.5px', fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.2s ease', userSelect: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.color = isGroovelabKiosk ? '#fde68a' : '#e2e8f0';
                  }}
                >
                  <Upload size={13} />
                  <span>Foto / Screenshot hochladen</span>
                  <input
                    id="qr-photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={onFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            )}

            {onTogglePlatform && (
              <button 
                type="button"
                onClick={() => {
                  onTogglePlatform(!isGroovelabKiosk);
                  onSelectMethod('qr');
                }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '11px 18px', borderRadius: '16px', 
                  background: isGroovelabKiosk 
                    ? 'rgba(250, 204, 21, 0.12)' 
                    : 'rgba(255, 255, 255, 0.08)',
                  border: isGroovelabKiosk ? '1px solid rgba(250, 204, 21, 0.30)' : '1px solid rgba(255, 255, 255, 0.14)',
                  color: '#ffffff', fontSize: '13.5px',
                  fontWeight: 800, cursor: 'pointer', marginTop: '6px', 
                  transition: 'background 0.25s ease, border-color 0.25s ease',
                  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isGroovelabKiosk 
                    ? 'rgba(250, 204, 21, 0.20)' 
                    : 'rgba(255, 255, 255, 0.14)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isGroovelabKiosk 
                    ? 'rgba(250, 204, 21, 0.12)' 
                    : 'rgba(255, 255, 255, 0.08)';
                }}
              >
                {isGroovelabKiosk ? (
                  <>
                    <GraduationCap size={17} color="#4ade80" />
                    <span>Zurück zum Campus-Modus</span>
                  </>
                ) : (
                  <>
                    <Tablet size={17} color="#facc15" />
                    <span>GrooveLab Kiosk-Modus</span>
                  </>
                )}
              </button>
            )}

            {effectiveStationId && (
              <div 
                aria-hidden={!isGroovelabKiosk}
                style={{ 
                  maxHeight: isGroovelabKiosk ? '24px' : '0px',
                  opacity: isGroovelabKiosk ? 1 : 0,
                  overflow: 'hidden',
                  transition: 'max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease, margin 0.35s ease',
                  fontSize: '11px', fontWeight: 700, color: '#fde68a', textAlign: 'center', 
                  marginTop: isGroovelabKiosk ? '4px' : '0px'
                }}
              >
                iPad-Station: {effectiveStationId}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: AUSWEIS-ID & PIN (0,1% APPLE GOLDSTANDARD SATELLIT) ─── */}
        {activeMethod === 'pin' && (
          <CampusIdPinAuthCard
            isGroovelabKiosk={isGroovelabKiosk}
            schoolNumber={currentSchoolNum}
            schoolId={schoolData?.id}
            pinLockoutSeconds={pinLockoutSeconds}
            loading={loading}
            onSubmitId={(codeOrUser) => handlePinLogin(codeOrUser)}
            onSwitchToCamera={() => onSelectMethod('qr')}
            brandAccentColor={brandAccentColor}
            brandPrimaryColor={brandPrimaryColor}
            brandActiveTabColor={brandActiveTabColor}
          />
        )}

        {/* ─── TAB 3: PASSKEY BIOMETRIE ─── */}
        {activeMethod === 'passkey' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '6px 0' }}>
            {scopedBiometricProfiles.length > 0 ? (
              <>
                <div 
                  style={{
                    width: '60px', height: '60px', borderRadius: '20px',
                    background: isGroovelabKiosk ? 'rgba(250, 204, 21, 0.15)' : 'rgba(74, 222, 128, 0.15)',
                    border: isGroovelabKiosk ? '1px solid rgba(250, 204, 21, 0.35)' : '1px solid rgba(74, 222, 128, 0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <Fingerprint size={32} color={brandAccentColor} />
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                    Touch ID &amp; Face ID
                  </div>
                  <div style={{ fontSize: '12px', color: isGroovelabKiosk ? '#fde68a' : '#cbd5e1', marginTop: '4px' }}>
                    {selectedBiometricUser ? (
                      <>
                        Angemeldet als <strong style={{ color: '#ffffff' }}>{selectedBiometricUser.firstName} {selectedBiometricUser.lastName}</strong>
                      </>
                    ) : (
                      'Schlüssellos mit biometrischem Passkey anmelden.'
                    )}
                  </div>
                </div>

                {/* Profil-Auswahl falls mehrere biometrische Profile vorhanden */}
                {scopedBiometricProfiles.length > 1 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                    {scopedBiometricProfiles.map((p) => {
                      const isSelected = selectedBiometricUser?.userId === p.userId;
                      const avatarSrc = p.photoUrl || resolveCampusStudentAvatar(p);
                      return (
                        <div
                          key={p.userId}
                          onClick={() => setSelectedBiometricUser(p)}
                          role="button"
                          tabIndex={0}
                          aria-selected={isSelected}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px 4px 4px',
                            borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
                            border: isSelected ? (isGroovelabKiosk ? '2px solid #facc15' : '2px solid #4ade80') : '1px solid rgba(255,255,255,0.2)',
                            background: isSelected ? (isGroovelabKiosk ? 'rgba(250, 204, 21, 0.25)' : 'rgba(74, 222, 128, 0.25)') : 'rgba(255, 255, 255, 0.05)',
                            color: '#ffffff', cursor: 'pointer', transition: 'all 0.15s ease'
                          }}
                        >
                          <img
                            src={avatarSrc}
                            alt={p.firstName}
                            style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                            onError={(e) => { (e.target as HTMLImageElement).src = '/avatars/gitarre_avatar_new.png'; }}
                          />
                          <span>{p.firstName}</span>
                          <button
                            type="button"
                            onClick={(e) => handleRemoveBiometricUser(p.userId, e)}
                            title="Profil entfernen"
                            aria-label="Profil entfernen"
                            style={{ background: 'transparent', border: 'none', color: 'rgba(255, 255, 255, 0.6)', cursor: 'pointer', padding: 0, display: 'flex', marginLeft: '2px' }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleTriggerBiometricLogin(selectedBiometricUser?.userId)}
                  disabled={biometricLoading}
                  style={{
                    width: '100%', padding: '14px 18px', borderRadius: '16px',
                    background: brandPrimaryColor, color: brandActiveTabColor,
                    border: 'none', fontWeight: 800, fontSize: '13.5px', cursor: biometricLoading ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: isGroovelabKiosk ? '0 4px 14px rgba(250, 204, 21, 0.35)' : '0 4px 14px rgba(22, 163, 74, 0.35)'
                  }}
                >
                  <Fingerprint size={16} />
                  <span>{biometricLoading ? 'Prüfe Hardware...' : 'Mit Passkey anmelden'}</span>
                </button>
              </>
            ) : (
              /* Aufklärung & Schnelleinstieg wenn noch kein Passkey hinterlegt */
              <>
                <div 
                  style={{
                    width: '56px', height: '56px', borderRadius: '18px',
                    background: isGroovelabKiosk ? 'rgba(250, 204, 21, 0.12)' : 'rgba(74, 222, 128, 0.12)',
                    border: isGroovelabKiosk ? '1px solid rgba(250, 204, 21, 0.3)' : '1px solid rgba(74, 222, 128, 0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <ShieldCheck size={28} color={brandAccentColor} />
                </div>

                <div style={{ textAlign: 'center', maxWidth: '340px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                    Touch ID &amp; Face ID
                  </div>
                  <div style={{ fontSize: '12px', color: isGroovelabKiosk ? '#fde68a' : '#cbd5e1', marginTop: '6px', lineHeight: 1.4 }}>
                    Melde dich direkt mit deinem Touch ID / Face ID Passkey (z.&nbsp;B. via iCloud Schlüsselbund) an oder wechsle zu QR-Ausweis / PIN:
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleTriggerBiometricLogin()}
                  disabled={biometricLoading}
                  style={{
                    width: '100%', padding: '14px 18px', borderRadius: '16px',
                    background: brandPrimaryColor, color: brandActiveTabColor,
                    border: 'none', fontWeight: 800, fontSize: '13.5px', cursor: biometricLoading ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: isGroovelabKiosk ? '0 4px 14px rgba(250, 204, 21, 0.35)' : '0 4px 14px rgba(22, 163, 74, 0.35)',
                    marginTop: '4px'
                  }}
                >
                  <Fingerprint size={16} />
                  <span>{biometricLoading ? 'Prüfe Hardware...' : 'Mit Touch ID / Face ID anmelden'}</span>
                </button>

                <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectMethod('qr');
                    }}
                    style={{
                      flex: 1, padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.08)', color: '#ffffff', fontWeight: 750, fontSize: '12px',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    <QrCode size={14} color={brandAccentColor} />
                    <span>QR-Ausweis</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectMethod('pin')}
                    style={{
                      flex: 1, padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.08)', color: '#ffffff', fontWeight: 750, fontSize: '12px',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    <CreditCard size={14} color={brandAccentColor} />
                    <span>Ausweis-ID</span>
                  </button>
                </div>
              </>
            )}

            {biometricError && (
              <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700, textAlign: 'center' }}>
                {biometricError}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── BILDUNGSFÖRDERER PATRONAT (0,1% GOLDSTANDARD: UNTER DER AKTIONSBÜHNE) ─── */}
      <div style={{ width: '100%', maxWidth: '460px', marginTop: '12px', display: 'flex', justifyContent: 'center', zIndex: 3 }}>
        <CampusLoginSponsorBadge 
          schoolId={schoolData?.id} 
          schoolData={schoolData} 
          isGroovelabKiosk={isGroovelabKiosk} 
          style={{ marginBottom: 0 }}
        />
      </div>

      {/* ─── FEST VERANKERTER RECHTSTEXTE-FOOTER (BFSG & DSGVO GOLDSTANDARD) ─── */}
      <footer 
        role="contentinfo"
        aria-label="Rechtliche Hinweise und Barrierefreiheit"
        style={{ 
          marginTop: '8px', display: 'flex', gap: '16px', fontSize: '11.5px', fontWeight: 800, 
          color: isGroovelabKiosk ? '#713f12' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em',
          alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', zIndex: 3
        }}
      >
        <span 
          role="button"
          tabIndex={0}
          onClick={() => setLegalModalTab('privacy')} 
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLegalModalTab('privacy'); } }}
          style={{ cursor: 'pointer', outline: 'none', borderRadius: '4px', padding: '2px 4px', transition: 'color 0.2s' }} 
          onMouseEnter={(e) => { e.currentTarget.style.color = isGroovelabKiosk ? '#0f172a' : '#ffffff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = isGroovelabKiosk ? '#713f12' : '#94a3b8'; }}
        >
          Datenschutz
        </span>
        <span style={{ opacity: isGroovelabKiosk ? 0.6 : 0.4, color: isGroovelabKiosk ? '#713f12' : '#94a3b8' }}>•</span>
        <span 
          role="button"
          tabIndex={0}
          onClick={() => setLegalModalTab('child_protection')} 
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLegalModalTab('child_protection'); } }}
          style={{ cursor: 'pointer', outline: 'none', borderRadius: '4px', padding: '2px 4px', transition: 'color 0.2s' }} 
          onMouseEnter={(e) => { e.currentTarget.style.color = isGroovelabKiosk ? '#0f172a' : '#ffffff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = isGroovelabKiosk ? '#713f12' : '#94a3b8'; }}
        >
          Verhaltensregeln
        </span>
        <span style={{ opacity: isGroovelabKiosk ? 0.6 : 0.4, color: isGroovelabKiosk ? '#713f12' : '#94a3b8' }}>•</span>
        <span 
          role="button"
          tabIndex={0}
          onClick={() => setLegalModalTab('impressum')} 
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLegalModalTab('impressum'); } }}
          style={{ cursor: 'pointer', outline: 'none', borderRadius: '4px', padding: '2px 4px', transition: 'color 0.2s' }} 
          onMouseEnter={(e) => { e.currentTarget.style.color = isGroovelabKiosk ? '#0f172a' : '#ffffff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = isGroovelabKiosk ? '#713f12' : '#94a3b8'; }}
        >
          Impressum
        </span>
        <span style={{ opacity: isGroovelabKiosk ? 0.6 : 0.4, color: isGroovelabKiosk ? '#713f12' : '#94a3b8' }}>•</span>
        <span 
          role="button"
          tabIndex={0}
          onClick={() => setLegalModalTab('accessibility')} 
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLegalModalTab('accessibility'); } }}
          style={{ cursor: 'pointer', outline: 'none', borderRadius: '4px', padding: '2px 4px', transition: 'color 0.2s' }} 
          onMouseEnter={(e) => { e.currentTarget.style.color = isGroovelabKiosk ? '#0f172a' : '#ffffff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = isGroovelabKiosk ? '#713f12' : '#94a3b8'; }}
        >
          Barrierefreiheit
        </span>
        <span style={{ opacity: isGroovelabKiosk ? 0.6 : 0.4, color: isGroovelabKiosk ? '#713f12' : '#94a3b8' }}>•</span>
        <span 
          role="button"
          tabIndex={0}
          onClick={handleSchoolSelectionClick} 
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSchoolSelectionClick(); } }}
          style={{ cursor: 'pointer', outline: 'none', borderRadius: '4px', padding: '2px 4px', transition: 'color 0.2s' }} 
          onMouseEnter={(e) => { e.currentTarget.style.color = isGroovelabKiosk ? '#0f172a' : '#ffffff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = isGroovelabKiosk ? '#713f12' : '#94a3b8'; }}
        >
          Schule wechseln
        </span>
      </footer>

      {/* ─── ENTWICKLER FAST-PATH (NUR LOCALHOST, DEZENT AM BODEN) ─── */}
      {devBypassSlot && (
        <div style={{ width: '100%', maxWidth: '460px', marginTop: '12px', display: 'flex', justifyContent: 'center', zIndex: 3 }}>
          {devBypassSlot}
        </div>
      )}

      {/* ─── APPLE SIGHT KEYFRAMES FÜR SCANNER LASER, FOCUS-GUARD & PLACEHOLDER ─── */}
      <style>{`
        @keyframes scanLaser {
          0% { top: -10%; }
          50% { top: 95%; }
          100% { top: -10%; }
        }
        .login-studio-container {
          --primary-color: ${isGroovelabKiosk ? '#facc15' : '#4ade80'} !important;
        }
        #login-credential-input:focus-visible {
          outline: 2px solid ${isGroovelabKiosk ? '#facc15' : '#4ade80'} !important;
          outline-offset: 2px !important;
        }
        #login-credential-input::placeholder {
          color: rgba(255, 255, 255, 0.50) !important;
        }
      `}</style>
    </div>
  );
};
