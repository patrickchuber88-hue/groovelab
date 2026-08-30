import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Search, School, MapPin, Loader2, ArrowRight, ShieldCheck, Lock, X, Eye, EyeOff, KeyRound, AlertTriangle, Fingerprint } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isWebAuthnSupported, isMasterPasskeyRegistered, registerMasterPasskey, authenticateMasterPasskey } from '../utils/webauthn';
import { createMasterSessionLease, logMasterAdminEvent } from '../utils/masterAuditLogger';
import { verifyTOTP } from '../utils/totp';
import { RegistrationAccessModal } from './RegistrationAccessModal';
import { isRegistrationUnlocked } from '../utils/cryptoAuth';

interface LandingPage2Props {
  onLogin: () => void;
  onRegister: (email?: string) => void;
  onShowPrivacy: () => void;
  onShowAgb: () => void;
  onShowImpressum: () => void;
}

export const LandingPage2: React.FC<LandingPage2Props> = ({ 
  onLogin, 
  onRegister,
  onShowPrivacy,
  onShowAgb,
  onShowImpressum
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [showAccessModal, setShowAccessModal] = useState(false);

  const triggerProtectedRegistration = (targetEmail?: string) => {
    setShowAccessModal(true);
  };

  // Hardened Master Admin Auth State (Enterprise+ Stufe 3)
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [authStep, setAuthStep] = useState<1 | 2>(1);
  const [pendingMasterUser, setPendingMasterUser] = useState<any>(null);
  const [totpInput, setTotpInput] = useState<string>('');
  const [masterKeyInput, setMasterKeyInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [isLoggingInMaster, setIsLoggingInMaster] = useState(false);
  const [masterAuthError, setMasterAuthError] = useState<string | null>(null);
  const [hasPasskey, setHasPasskey] = useState(false);
  const [isWebAuthnAvail, setIsWebAuthnAvail] = useState(false);
  const bgClicksRef = useRef<{ count: number; lastTime: number }>({ count: 0, lastTime: 0 });

  useEffect(() => {
    setIsWebAuthnAvail(isWebAuthnSupported());
    setHasPasskey(isMasterPasskeyRegistered());
  }, [showMasterModal]);

  // Secret Keyboard Shortcut: Ctrl + Shift + M or Cmd + Shift + M
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'M' || e.key === 'm')) {
        e.preventDefault();
        setShowMasterModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generic fallback schools for offline/demo scenarios (Zero PII / Real School Leakage)
  const FALLBACK_SCHOOLS = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Demo Musikschule',
      subdomain: 'demo',
      city: 'Musterstadt',
      has_campus_subscription: true,
      has_groovelab_subscription: true,
      logo_url: null
    }
  ];

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const queryPromise = supabase.rpc('search_public_schools', { p_query: searchQuery.trim() });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), 2500)
        );

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

        if (!error && Array.isArray(data)) {
          const cleanData = data.filter((s: any) => !s.name?.toLowerCase().includes('groove academy'));
          setSearchResults(cleanData);
          // Cache successful school list
          try {
            localStorage.setItem('groovelab_cached_schools', JSON.stringify(cleanData));
          } catch (e) {}
        } else {
          throw error || new Error('No data');
        }
      } catch (err) {
        console.error('Search error, using fallback:', err);
        // Load from local storage cache if available
        let fallbackList = FALLBACK_SCHOOLS;
        try {
          const cached = localStorage.getItem('groovelab_cached_schools');
          if (cached) {
            fallbackList = JSON.parse(cached);
          }
        } catch (e) {}
        
        const filtered = fallbackList
          .filter((s: any) => !s.name?.toLowerCase().includes('groove academy'))
          .filter((s: any) => 
            (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
            (s.city || '').toLowerCase().includes(searchQuery.toLowerCase())
          );
        setSearchResults(filtered);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSchoolSelect = (school: any) => {
    if (typeof window !== 'undefined') {
      let targetPlatform = 'campus'; // Default to campus
      if (!school.has_campus_subscription && school.has_groovelab_subscription) {
        targetPlatform = 'groovelab';
      }

      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalhost) {
        window.location.href = `http://${window.location.hostname}:${window.location.port}/?subdomain=${school.subdomain}&platform=${targetPlatform}`;
      } else {
        const baseDomain = window.location.hostname.replace('www.', ''); // e.g. campus-groovelab.de
        window.location.href = `${window.location.protocol}//${school.subdomain}.${baseDomain}/?platform=${targetPlatform}`;
      }
    }
  };

  const handleBackgroundClick = (e: React.MouseEvent | React.TouchEvent) => {
    // Only count clicks on the background canvas, ignoring search inputs, results, buttons, footer links, and modals
    const target = e.target as HTMLElement;
    if (target.closest('.magic-search-container, .footer-link, .search-result-item, .master-auth-modal, input, button')) {
      return;
    }
    const now = Date.now();
    // Ignore synthetic click right after touch
    if (now - bgClicksRef.current.lastTime < 60) return;

    if (now - bgClicksRef.current.lastTime < 1800) {
      bgClicksRef.current.count += 1;
    } else {
      bgClicksRef.current.count = 1;
    }
    bgClicksRef.current.lastTime = now;

    if (bgClicksRef.current.count >= 5) {
      bgClicksRef.current.count = 0;
      setShowMasterModal(true);
    }
  };

  const handlePasskeyLogin = async () => {
    setIsLoggingInMaster(true);
    setMasterAuthError(null);
    try {
      const profile = await authenticateMasterPasskey();
      setFailedAttempts(0);
      setLockoutUntil(null);
      sessionStorage.setItem('groovelab_user_id', profile.userId);
      sessionStorage.setItem('groovelab_is_master_admin', 'true');
      sessionStorage.setItem('groovelab_active_workspace', 'master_admin');
      sessionStorage.setItem('groovelab_active_platform', 'campus');
      localStorage.setItem('groovelab_user_id', profile.userId);
      localStorage.setItem('groovelab_is_master_admin', 'true');
      localStorage.setItem('groovelab_active_workspace', 'master_admin');
      await createMasterSessionLease(profile.userId, 'passkey_fido2', 45);
      window.location.href = '/';
    } catch (err: any) {
      console.error('Master passkey auth error:', err);
      setMasterAuthError(err.message || 'Passkey-Authentifizierung fehlgeschlagen.');
      setIsLoggingInMaster(false);
    }
  };

  const handleMasterLogin = async () => {
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remainingSecs = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setMasterAuthError(`Sicherheitssperre aktiv. Bitte warten Sie noch ${remainingSecs} Sekunden.`);
      return;
    }

    const cleanKey = masterKeyInput.trim();
    if (!cleanKey) {
      setMasterAuthError('Bitte Master-Sicherheitsschlüssel oder PIN eingeben.');
      return;
    }

    setIsLoggingInMaster(true);
    setMasterAuthError(null);
    try {
      sessionStorage.removeItem('groovelab_is_master_admin');

      // Verify key against master RPC, master tokens or registered admin users
      let user: any = null;

      // 1. Authenticate via secure private vault RPC
      try {
        const { data: rpcUser } = await supabase.rpc('login_master_admin', {
          p_username: 'admin',
          p_password: cleanKey
        });
        if (rpcUser && rpcUser.id && rpcUser.is_master_admin === true) {
          user = rpcUser;
        }
      } catch (rpcErr) {
        console.warn('RPC master login check:', rpcErr);
      }

      if (!user) {
        const nextFailed = failedAttempts + 1;
        setFailedAttempts(nextFailed);
        await logMasterAdminEvent({
          userId: cleanKey.substring(0, 4) + '***',
          action: 'master_login_failed',
          authMethod: 'master_pin',
          status: 'FAILURE',
          details: { attempt: nextFailed }
        });
        if (nextFailed >= 3) {
          const lockTime = Date.now() + 5 * 60 * 1000;
          setLockoutUntil(lockTime);
          throw new Error('Sicherheitssperre: 3 ungültige Versuche. Login für 5 Minuten gesperrt.');
        }
        throw new Error(`Ungültiger Master-Schlüssel. Zugriff verweigert (Versuch ${nextFailed}/3).`);
      }

      // Check if user has 2FA enabled
      if (user.is_2fa_enabled && user.two_factor_secret) {
        setPendingMasterUser(user);
        setAuthStep(2);
        setMasterAuthError(null);
        setIsLoggingInMaster(false);
        return;
      }

      await finalizeMasterSession(user);
    } catch (err: any) {
      console.error('Master admin auth error:', err);
      setMasterAuthError(err.message || 'Authentifizierungsfehler');
      setIsLoggingInMaster(false);
    }
  };

  const handleVerifyTotp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pendingMasterUser) return;
    const cleanCode = totpInput.replace(/\s+/g, '').trim();
    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      setMasterAuthError('Bitte den 6-stelligen Code aus der Authenticator-App eingeben.');
      return;
    }
    setIsLoggingInMaster(true);
    setMasterAuthError(null);
    try {
      const isValid = await verifyTOTP(cleanCode, pendingMasterUser.two_factor_secret);
      if (!isValid) {
        throw new Error('Ungültiger 2FA-Code. Bitte prüfen Sie die Uhrzeit auf Ihrem Smartphone.');
      }
      await finalizeMasterSession(pendingMasterUser);
    } catch (err: any) {
      setMasterAuthError(err.message || '2FA-Verifikation fehlgeschlagen.');
      setIsLoggingInMaster(false);
    }
  };

  const finalizeMasterSession = async (user: any) => {
    // Success: Issue Ephemeral Session Lease (45 minutes TTL)
    setFailedAttempts(0);
    setLockoutUntil(null);
    sessionStorage.setItem('groovelab_user_id', user.id);
    sessionStorage.setItem('groovelab_is_master_admin', 'true');
    sessionStorage.setItem('groovelab_active_workspace', 'master_admin');
    sessionStorage.setItem('groovelab_active_platform', 'campus');
    localStorage.setItem('groovelab_user_id', user.id);
    localStorage.setItem('groovelab_is_master_admin', 'true');
    localStorage.setItem('groovelab_active_workspace', 'master_admin');
    await createMasterSessionLease(user.id, 'master_pin', 45);

    // Offer to register Passkey if WebAuthn is supported and not registered yet
    if (isWebAuthnAvail && !hasPasskey) {
      try {
        const registerConsent = window.confirm('Möchten Sie dieses Gerät (TouchID / YubiKey) für 1-Klick Master-Logins koppeln?');
        if (registerConsent) {
          await registerMasterPasskey(user.id, 'master@campus-groovelab.de');
          alert('Hardware-Passkey erfolgreich gekoppelt!');
        }
      } catch (passkeyErr: any) {
        console.warn('Passkey registration skipped:', passkeyErr);
      }
    }

    // Refresh to load Master Cockpit
    window.location.href = '/';
  };

  return (
    <div 
      onClick={handleBackgroundClick}
      onTouchEnd={handleBackgroundClick}
      style={{
      minHeight: '100vh',
      background: '#050505', // Deep absolute dark
      fontFamily: '"Outfit", "Inter", system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      color: '#f4f4f5',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      {/* Dynamic background ambient glows */}
      <style>{`
        @keyframes float-glow-1 {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(40px, -60px) scale(1.2); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes float-glow-2 {
          0% { transform: translate(0px, 0px) scale(1.1); }
          50% { transform: translate(-50px, 50px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1.1); }
        }
        .ambient-glow-1 {
          position: absolute;
          top: 10%;
          left: 15%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0) 70%);
          filter: blur(80px);
          pointer-events: none;
          animation: float-glow-1 15s infinite ease-in-out;
        }
        .ambient-glow-2 {
          position: absolute;
          bottom: 10%;
          right: 15%;
          width: 650px;
          height: 650px;
          background: radial-gradient(circle, rgba(234, 179, 8, 0.06) 0%, rgba(234, 179, 8, 0) 70%);
          filter: blur(90px);
          pointer-events: none;
          animation: float-glow-2 18s infinite ease-in-out;
        }
        
        /* Magic Search Styles */
        .magic-search-container {
          position: relative;
          width: 100%;
          max-width: 580px;
          margin: 40px auto 0;
          z-index: 20;
        }
        .magic-search-input {
          width: 100%;
          background: rgba(20, 20, 25, 0.65);
          backdrop-filter: blur(32px);
          -webkit-backdrop-filter: blur(32px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 24px 32px 24px 64px;
          font-size: 1.25rem;
          color: #ffffff;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.08);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          outline: none;
          font-family: inherit;
        }
        .magic-search-input:focus {
          border-color: rgba(16, 185, 129, 0.5);
          box-shadow: 0 40px 80px rgba(0, 0, 0, 0.7), 0 0 0 2px rgba(16, 185, 129, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.15);
          background: rgba(24, 24, 30, 0.8);
        }
        .magic-search-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }
        .magic-search-icon {
          position: absolute;
          left: 24px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255, 255, 255, 0.4);
          transition: color 0.3s;
          pointer-events: none;
        }
        .magic-search-input:focus ~ .magic-search-icon {
          color: #10b981;
        }
        
        /* Dropdown Results */
        .search-results-dropdown {
          position: absolute;
          top: calc(100% + 16px);
          left: 0;
          right: 0;
          background: rgba(24, 24, 28, 0.85);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 12px;
          box-shadow: 0 40px 100px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.1);
          opacity: 0;
          visibility: hidden;
          transform: translateY(-10px);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          max-height: 400px;
          overflow-y: auto;
        }
        .search-results-dropdown.visible {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }
        .search-result-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          text-align: left;
          background: transparent;
          border: 1px solid transparent;
        }
        .search-result-item:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.15);
          transform: scale(1.015) translateY(-1px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 16px rgba(255, 255, 255, 0.05);
        }
        .school-logo-placeholder {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #a1a1aa;
        }
        .school-logo-image {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          object-fit: contain;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: #ffffff;
          padding: 4px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }
        
        .text-gradient {
          background: linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* Footer Links */
        .footer-link {
          color: #71717a;
          text-decoration: none;
          font-size: 0.8rem;
          font-weight: 600;
          transition: all 0.2s;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .footer-link:hover {
          color: #f4f4f5;
        }
        
        /* Scrollbar for dropdown */
        .search-results-dropdown::-webkit-scrollbar {
          width: 6px;
        }
        .search-results-dropdown::-webkit-scrollbar-track {
          background: transparent;
        }
        .search-results-dropdown::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .search-results-dropdown::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>

      {/* Decorative Blur Spheres */}
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '800px', padding: '0 20px' }}>
        
        {/* Header / Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', marginBottom: '16px' }}>
          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.75rem',
              fontWeight: 800,
              color: '#10b981',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              padding: '8px 20px',
              borderRadius: '100px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.05)',
              cursor: 'default',
              userSelect: 'none'
            }}>
            <Sparkles size={14} style={{ color: '#facc15' }} />
            Campus-Groovelab
          </div>
          
          <h1 className="text-gradient" style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 800,
            margin: '0',
            letterSpacing: '-0.03em',
            lineHeight: 1.1
          }}>
            Finde deine Musikschule
          </h1>
          
          <p style={{
            fontSize: '1.1rem',
            color: '#a1a1aa',
            maxWidth: '460px',
            margin: '0 auto',
            lineHeight: 1.6,
            fontWeight: 400
          }}>
            Logge dich in das Profil deiner Schule ein und entdecke deinen Fortschritt, Aufgaben und Repertoire.
          </p>
        </div>

        {/* Magic Search */}
        <div className="magic-search-container" ref={searchRef}>
          <input
            type="text"
            className="magic-search-input"
            placeholder="Name deiner Schule..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
          />
          <div className="magic-search-icon">
            {isSearching ? <Loader2 size={24} className="animate-spin" /> : <Search size={24} />}
          </div>

          {/* Results Dropdown */}
          <div className={`search-results-dropdown ${showResults && searchQuery.length >= 2 ? 'visible' : ''}`}>
            {searchResults.length > 0 ? (
              searchResults.map((school) => (
                <div 
                  key={school.id} 
                  className="search-result-item"
                  onClick={() => handleSchoolSelect(school)}
                >
                  {school.logo_url ? (
                    <img src={school.logo_url} alt={school.name} className="school-logo-image" />
                  ) : (
                    <div className="school-logo-placeholder">
                      <School size={24} style={{ opacity: 0.6 }} />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ffffff' }}>
                        {school.name}
                      </span>
                      {school.has_campus_subscription && (
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          color: '#34a853',
                          background: 'rgba(52, 168, 83, 0.1)',
                          border: '1px solid rgba(52, 168, 83, 0.2)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Campus
                        </span>
                      )}
                      {school.has_groovelab_subscription && (
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          color: '#eab308',
                          background: 'rgba(234, 179, 8, 0.1)',
                          border: '1px solid rgba(234, 179, 8, 0.2)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          GrooveLab
                        </span>
                      )}
                    </div>
                    {school.city && (
                      <div style={{ fontSize: '0.85rem', color: '#71717a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} />
                        {school.city}
                      </div>
                    )}
                  </div>
                  <div style={{ color: '#10b981', opacity: 0.8, display: 'flex', alignItems: 'center' }}>
                    <ArrowRight size={20} />
                  </div>
                </div>
              ))
            ) : !isSearching && searchQuery.length >= 2 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: '#71717a' }}>
                <School size={32} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 500, marginBottom: '4px' }}>Keine Schule gefunden</div>
                <div style={{ fontSize: '0.85rem' }}>Überprüfe die Schreibweise oder frage deinen Lehrer.</div>
              </div>
            ) : null}
          </div>
        </div>

      </div>

      {/* Footer Links */}
      <div style={{
        position: 'absolute',
        bottom: '32px',
        left: '0',
        right: '0',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '32px',
        padding: '0 24px',
        flexWrap: 'wrap'
      }}>
        <div className="footer-link" onClick={() => triggerProtectedRegistration()}>
          <School size={14} />
          Als Schule registrieren
        </div>
        <div style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.1)' }}></div>
        <div className="footer-link" onClick={() => onShowPrivacy()}>Datenschutz</div>
        <div className="footer-link" onClick={() => onShowAgb()}>AGB</div>
        <div className="footer-link" onClick={() => onShowImpressum()}>Impressum</div>
      </div>

      {/* Secret Master Admin Authentication Modal */}
      {showMasterModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowMasterModal(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            className="master-auth-modal"
            style={{
              background: 'linear-gradient(145deg, #141418 0%, #0a0a0d 100%)',
              border: '1px solid rgba(234, 179, 8, 0.35)',
              borderRadius: '24px',
              padding: '36px 32px 32px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(234, 179, 8, 0.12)',
              position: 'relative',
              textAlign: 'center',
              color: '#ffffff'
            }}
          >
            <button
              onClick={() => setShowMasterModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a1a1aa',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <X size={16} />
            </button>

            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '18px',
              background: 'rgba(234, 179, 8, 0.12)',
              border: '1px solid rgba(234, 179, 8, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: '#facc15'
            }}>
              <ShieldCheck size={30} />
            </div>

            <div style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#facc15',
              marginBottom: '6px'
            }}>
              Privilegierter Systemzugang
            </div>

            <h3 style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              margin: '0 0 8px 0',
              color: '#ffffff'
            }}>
              Master Cockpit Login
            </h3>

            {authStep === 1 ? (
              <>
                <p style={{
                  fontSize: '0.85rem',
                  color: '#94a3b8',
                  lineHeight: 1.5,
                  margin: '0 0 20px 0'
                }}>
                  Geben Sie Ihren autorisierten Master-Admin-Sicherheitsschlüssel oder PIN ein.
                </p>

                {/* If Passkey is registered on this device, offer 1-Click Biometrics */}
                {hasPasskey && (
                  <div style={{ marginBottom: '18px' }}>
                    <button
                      type="button"
                      onClick={handlePasskeyLogin}
                      disabled={isLoggingInMaster || (!!lockoutUntil && Date.now() < lockoutUntil)}
                      style={{
                        width: '100%',
                        padding: '13px 18px',
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        color: '#ffffff',
                        border: '1px solid rgba(147, 197, 253, 0.4)',
                        borderRadius: '16px',
                        fontSize: '0.92rem',
                        fontWeight: 800,
                        cursor: (isLoggingInMaster || (!!lockoutUntil && Date.now() < lockoutUntil)) ? 'not-allowed' : 'pointer',
                        boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s',
                        opacity: (isLoggingInMaster || (!!lockoutUntil && Date.now() < lockoutUntil)) ? 0.6 : 1
                      }}
                    >
                      <Fingerprint size={20} />
                      1-Klick Hardware-Passkey (TouchID / YubiKey)
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0 10px', color: '#64748b', fontSize: '0.72rem', fontWeight: 800 }}>
                      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.12)' }} />
                      <span>ODER MIT MASTER-PIN / SCHLÜSSEL</span>
                      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.12)' }} />
                    </div>
                  </div>
                )}

                {/* Input for Master Key */}
                <div style={{ position: 'relative', marginBottom: '16px', textAlign: 'left' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#d4d4d8', marginBottom: '6px' }}>
                    Master-Sicherheitsschlüssel / PIN
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      value={masterKeyInput}
                      onChange={(e) => {
                        setMasterKeyInput(e.target.value);
                        if (masterAuthError) setMasterAuthError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isLoggingInMaster) handleMasterLogin();
                      }}
                      placeholder="Master-Schlüssel eingeben..."
                      autoFocus
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '14px',
                        padding: '12px 42px 12px 16px',
                        color: '#ffffff',
                        fontSize: '0.95rem',
                        outline: 'none',
                        fontFamily: showPassword ? 'inherit' : 'monospace',
                        letterSpacing: showPassword ? 'normal' : '0.15em'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#71717a',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px'
                      }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {masterAuthError && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#fca5a5',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '0.82rem',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    textAlign: 'left'
                  }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                    <span>{masterAuthError}</span>
                  </div>
                )}

                <button
                  onClick={handleMasterLogin}
                  disabled={isLoggingInMaster || (!!lockoutUntil && Date.now() < lockoutUntil)}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '16px',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    cursor: (isLoggingInMaster || (!!lockoutUntil && Date.now() < lockoutUntil)) ? 'not-allowed' : 'pointer',
                    boxShadow: '0 8px 24px rgba(234, 179, 8, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    opacity: (isLoggingInMaster || (!!lockoutUntil && Date.now() < lockoutUntil)) ? 0.6 : 1
                  }}
                >
                  {isLoggingInMaster ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Verifiziere Master-Schlüssel...
                    </>
                  ) : (
                    <>
                      <KeyRound size={18} />
                      Verifizieren & Weiter
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <p style={{
                  fontSize: '0.85rem',
                  color: '#94a3b8',
                  lineHeight: 1.5,
                  margin: '0 0 20px 0'
                }}>
                  Geben Sie den aktuellen 6-stelligen Code aus Ihrer <strong>Google Authenticator</strong> oder Apple Passwörter App ein.
                </p>

                <div style={{ position: 'relative', marginBottom: '16px', textAlign: 'left' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#4ade80', marginBottom: '6px' }}>
                    🛡️ 6-stelliger 2FA-Code (TOTP)
                  </label>
                  <input 
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={totpInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setTotpInput(val);
                      if (masterAuthError) setMasterAuthError(null);
                      if (val.length === 6) {
                        setTimeout(() => {
                          handleVerifyTotp();
                        }, 50);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isLoggingInMaster) handleVerifyTotp();
                    }}
                    placeholder="000 000"
                    autoFocus
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1.5px solid #22c55e',
                      borderRadius: '14px',
                      padding: '14px',
                      color: '#ffffff',
                      fontSize: '1.4rem',
                      fontWeight: 900,
                      outline: 'none',
                      textAlign: 'center',
                      letterSpacing: '8px',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>

                {masterAuthError && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#fca5a5',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '0.82rem',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    textAlign: 'left'
                  }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                    <span>{masterAuthError}</span>
                  </div>
                )}

                <button
                  onClick={() => handleVerifyTotp()}
                  disabled={isLoggingInMaster || totpInput.length !== 6}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '16px',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    cursor: (isLoggingInMaster || totpInput.length !== 6) ? 'not-allowed' : 'pointer',
                    boxShadow: '0 8px 24px rgba(34, 197, 94, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    opacity: (isLoggingInMaster || totpInput.length !== 6) ? 0.6 : 1
                  }}
                >
                  {isLoggingInMaster ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Prüfe 2FA-Code...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} />
                      Code verifizieren & Leitstand öffnen
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthStep(1);
                    setTotpInput('');
                    setMasterAuthError(null);
                  }}
                  style={{
                    marginTop: '12px',
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '0.80rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    textDecoration: 'underline'
                  }}
                >
                  ‹ Zurück zu Schritt 1 (Passworteingabe)
                </button>
              </>
            )}

            <div style={{
              fontSize: '0.72rem',
              color: '#64748b',
              marginTop: '18px',
              fontWeight: 500
            }}>
              Shortcut: <code style={{ color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>Ctrl + Shift + M</code> oder 5× Hintergrundklick
            </div>
          </div>
        </div>
      )}
      {/* Protected Registration Access Modal */}
      <RegistrationAccessModal
        isOpen={showAccessModal}
        onClose={() => setShowAccessModal(false)}
        onSuccess={() => {
          setShowAccessModal(false);
          onRegister();
        }}
      />
    </div>
  );
};
