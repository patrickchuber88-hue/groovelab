import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Sparkles, Search, School, MapPin, Loader2, ArrowRight, ShieldCheck, 
  Lock, X, Eye, EyeOff, KeyRound, AlertTriangle, Fingerprint, 
  Building2, CheckCircle2, Compass, Layers, Clock, RotateCcw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isWebAuthnSupported, isMasterPasskeyRegistered, registerMasterPasskey, authenticateMasterPasskey } from '../utils/webauthn';
import { createMasterSessionLease, logMasterAdminEvent } from '../utils/masterAuditLogger';
import { verifyTOTP } from '../utils/totp';
import { RegistrationAccessModal } from './RegistrationAccessModal';

interface StartseiteProps {
  onLogin: () => void;
  onRegister: (email?: string) => void;
  onShowPrivacy?: () => void;
  onShowAgb?: () => void;
  onShowImpressum?: () => void;
}

export const Startseite: React.FC<StartseiteProps> = ({ 
  onLogin, 
  onRegister,
  onShowPrivacy,
  onShowAgb,
  onShowImpressum
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<'all' | 'campus' | 'groovelab'>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showAccessModal, setShowAccessModal] = useState(false);

  // Read last visited school for 1-click shortcut
  const [lastVisitedSchoolId, setLastVisitedSchoolId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const lastId = localStorage.getItem('groovelab_last_school_id');
      if (lastId) setLastVisitedSchoolId(lastId);
    } catch (e) {}
  }, []);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setFocusedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real fallback schools for offline/connection failure scenarios
  const FALLBACK_SCHOOLS = [
    {
      id: '53e83805-1d5a-4ed8-988e-1fb0b8200b9c',
      name: 'Musäk Bad Säckingen',
      subdomain: 'musaek-bad-saeckingen',
      city: 'Bad Säckingen',
      has_campus_subscription: true,
      has_groovelab_subscription: true,
      logo_url: 'https://www.musaek.de/wp-content/uploads/2021/03/musaek-logo-black-300x140.png'
    },
    {
      id: 'cc05137f-5904-4774-80be-6a172c52bf99',
      name: 'Musäk BS',
      subdomain: 'musaek-bs',
      city: 'Bad Säckingen',
      has_campus_subscription: true,
      has_groovelab_subscription: true,
      logo_url: null
    }
  ];

  const [allSchools, setAllSchools] = useState<any[]>([]);

  // Helper for normalizing umlauts & special chars
  const normalizeText = (str: string) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .trim()
      .replace(/[äöüß]/g, (match) => {
        const mapping: Record<string, string> = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' };
        return mapping[match] || match;
      })
      .replace(/[^a-z0-9]/g, '');
  };

  // Fetch all active schools on mount & store in state & cache
  useEffect(() => {
    let isMounted = true;

    // Load cached schools immediately if available (0ms FCP)
    try {
      const cached = localStorage.getItem('groovelab_cached_schools');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAllSchools(parsed);
        }
      }
    } catch (e) {}

    const fetchSchools = async () => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('id, name, subdomain, logo_url, city, address, postal_code, has_campus_subscription, has_groovelab_subscription, is_active')
          .not('is_active', 'eq', false)
          .order('name', { ascending: true });

        if (!error && data && data.length > 0) {
          const cleanData = data.filter((s: any) => !s.name?.toLowerCase().includes('groove academy'));
          if (isMounted) {
            setAllSchools(cleanData);
          }
          try {
            localStorage.setItem('groovelab_cached_schools', JSON.stringify(cleanData));
          } catch (e) {}
        }
      } catch (err) {
        console.error('Error fetching schools:', err);
      } finally {
        if (isMounted) {
          setIsSearching(false);
        }
      }
    };

    fetchSchools();
    return () => { isMounted = false; };
  }, []);

  // Compute filtered search results seamlessly
  const searchResults = useMemo(() => {
    const baseList = (allSchools.length > 0 ? allSchools : FALLBACK_SCHOOLS)
      .filter((s: any) => !s.name?.toLowerCase().includes('groove academy'));
    
    // 1. Filter by selected module
    let filtered = baseList;
    if (selectedModuleFilter === 'campus') {
      filtered = filtered.filter(s => s.has_campus_subscription);
    } else if (selectedModuleFilter === 'groovelab') {
      filtered = filtered.filter(s => s.has_groovelab_subscription);
    }

    // 2. Filter by search query
    const query = searchQuery.trim();
    if (!query) {
      return filtered;
    }

    const normQuery = normalizeText(query);
    const lowerQuery = query.toLowerCase();

    return filtered.filter((school: any) => {
      const rawName = (school.name || '').toLowerCase();
      const rawCity = (school.city || '').toLowerCase();
      const rawSub = (school.subdomain || '').toLowerCase();
      const rawAddr = (school.address || '').toLowerCase();
      const rawPostal = (school.postal_code || '').toLowerCase();

      const normName = normalizeText(school.name);
      const normCity = normalizeText(school.city);
      const normSub = normalizeText(school.subdomain);

      return (
        rawName.includes(lowerQuery) ||
        rawCity.includes(lowerQuery) ||
        rawSub.includes(lowerQuery) ||
        rawAddr.includes(lowerQuery) ||
        rawPostal.includes(lowerQuery) ||
        (normName && normName.includes(normQuery)) ||
        (normCity && normCity.includes(normQuery)) ||
        (normSub && normSub.includes(normQuery))
      );
    });
  }, [searchQuery, allSchools, selectedModuleFilter]);

  const handleSchoolSelect = (school: any) => {
    if (typeof window !== 'undefined') {
      let targetPlatform = 'campus'; // Default to campus when campus or campus+groovelab is booked
      if (!school.has_campus_subscription && school.has_groovelab_subscription) {
        targetPlatform = 'groovelab';
      }

      localStorage.setItem('groovelab_active_platform', targetPlatform);
      localStorage.setItem('groovelab_last_school_id', school.id);
      if (school.subdomain) {
        localStorage.setItem('groovelab_last_subdomain', school.subdomain);
      }

      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalhost) {
        window.location.href = `http://${window.location.hostname}:${window.location.port}/?school_id=${school.id}&subdomain=${school.subdomain}&platform=${targetPlatform}`;
      } else {
        const baseDomain = window.location.hostname.replace('www.', ''); // e.g. campus-groovelab.de
        window.location.href = `${window.location.protocol}//${school.subdomain}.${baseDomain}/?school_id=${school.id}&platform=${targetPlatform}`;
      }
    }
  };

  const handleKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowDropdown(true);
      setFocusedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < searchResults.length) {
        handleSchoolSelect(searchResults[focusedIndex]);
      } else if (searchResults.length > 0) {
        handleSchoolSelect(searchResults[0]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setFocusedIndex(-1);
      searchInputRef.current?.blur();
    }
  };

  const handleBackgroundClick = (e: React.MouseEvent | React.TouchEvent) => {
    // Only count clicks on the background canvas, ignoring search inputs, results, buttons, footer links, and modals
    const target = e.target as HTMLElement;
    if (target.closest('.magic-search-container, .footer-link, .search-result-item, .school-card-item, .master-auth-modal, input, button, .filter-chip')) {
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

      let user: any = null;

      // 1. Try secure RPC authentication first (validates master_admin_password directly in DB)
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

      // 2. Strict Fallback: Only exact match against master_admin_password where is_master_admin is true
      if (!user) {
        const { data: matchedUser } = await supabase
          .from('users')
          .select('id, role, is_master_admin, school_id, first_name, last_name, ausweis_nummer, qr_token, teacher_qr_token, master_admin_password')
          .eq('is_master_admin', true)
          .eq('master_admin_password', cleanKey)
          .limit(1)
          .maybeSingle();

        if (matchedUser && matchedUser.is_master_admin === true && matchedUser.master_admin_password === cleanKey) {
          user = matchedUser;
        }
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

    window.location.href = '/';
  };

  return (
    <div 
      onClick={handleBackgroundClick}
      onTouchEnd={handleBackgroundClick}
      style={{
        minHeight: '100vh',
        background: '#050505',
        fontFamily: '"Outfit", "Inter", system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '48px 20px 60px',
        color: '#f4f4f5',
        textAlign: 'center',
        position: 'relative',
        overflowX: 'hidden',
        overflowY: 'auto',
        boxSizing: 'border-box'
      }}
    >
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
          position: fixed;
          top: 10%;
          left: 15%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0) 70%);
          filter: blur(80px);
          pointer-events: none;
          animation: float-glow-1 15s infinite ease-in-out;
          z-index: 1;
        }
        .ambient-glow-2 {
          position: fixed;
          bottom: 10%;
          right: 15%;
          width: 650px;
          height: 650px;
          background: radial-gradient(circle, rgba(234, 179, 8, 0.06) 0%, rgba(234, 179, 8, 0) 70%);
          filter: blur(90px);
          pointer-events: none;
          animation: float-glow-2 18s infinite ease-in-out;
          z-index: 1;
        }
        
        /* Magic Search Styles */
        .magic-search-container {
          position: relative;
          width: 100%;
          max-width: 620px;
          margin: 32px auto 0;
          z-index: 30;
        }
        .magic-search-input-wrapper {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
        }
        .magic-search-input {
          width: 100%;
          background: rgba(20, 20, 25, 0.75);
          backdrop-filter: blur(32px);
          -webkit-backdrop-filter: blur(32px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 20px;
          padding: 20px 52px 20px 58px;
          font-size: 1.15rem;
          color: #ffffff;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.08);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          outline: none;
          font-family: inherit;
        }
        .magic-search-input:focus {
          border-color: rgba(16, 185, 129, 0.6);
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7), 0 0 0 2px rgba(16, 185, 129, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.15);
          background: rgba(24, 24, 30, 0.9);
        }
        .magic-search-input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }
        .magic-search-left-icon {
          position: absolute;
          left: 20px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255, 255, 255, 0.4);
          transition: color 0.25s;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .magic-search-input:focus ~ .magic-search-left-icon {
          color: #10b981;
        }
        .magic-search-clear-btn {
          position: absolute;
          right: 18px;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255, 255, 255, 0.08);
          border: none;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #a1a1aa;
          cursor: pointer;
          transition: all 0.2s;
        }
        .magic-search-clear-btn:hover {
          background: rgba(255, 255, 255, 0.18);
          color: #ffffff;
        }

        /* Filter Chips */
        .filter-chip {
          padding: 7px 14px;
          border-radius: 100px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          color: #94a3b8;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          user-select: none;
        }
        .filter-chip:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #f1f5f9;
        }
        .filter-chip.active-all {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.25);
          color: #ffffff;
        }
        .filter-chip.active-campus {
          background: rgba(52, 168, 83, 0.15);
          border-color: rgba(52, 168, 83, 0.4);
          color: #4ade80;
        }
        .filter-chip.active-groovelab {
          background: rgba(234, 179, 8, 0.15);
          border-color: rgba(234, 179, 8, 0.4);
          color: #facc15;
        }
        
        /* Dropdown Results (Spotlight Popup) */
        .search-results-dropdown {
          position: absolute;
          top: calc(100% + 12px);
          left: 0;
          right: 0;
          background: rgba(22, 22, 26, 0.95);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 20px;
          padding: 8px;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.85), inset 0 1px 1px rgba(255, 255, 255, 0.1);
          opacity: 0;
          visibility: hidden;
          transform: translateY(-8px);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          max-height: min(440px, 50vh);
          overflow-y: auto;
          scrollbar-gutter: stable;
          z-index: 50;
        }
        .search-results-dropdown.visible {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }
        .search-result-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          text-align: left;
          background: transparent;
          border: 1px solid transparent;
          user-select: none;
        }
        .search-result-item:hover, .search-result-item.focused {
          background: rgba(255, 255, 255, 0.07);
          border-color: rgba(255, 255, 255, 0.12);
          transform: translateY(-1px);
        }

        /* School Directory Cards (Grid) */
        .school-card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
          width: 100%;
          margin-top: 16px;
        }
        .school-card-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 18px 20px;
          background: rgba(20, 20, 25, 0.65);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          text-align: left;
          position: relative;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
        }
        .school-card-item:hover {
          background: rgba(28, 28, 36, 0.85);
          border-color: rgba(16, 185, 129, 0.4);
          transform: translateY(-2px);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5), 0 0 20px rgba(16, 185, 129, 0.08);
        }

        .school-logo-placeholder {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #a1a1aa;
          flex-shrink: 0;
        }
        .school-logo-image {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          object-fit: contain;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: #ffffff;
          padding: 4px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          flex-shrink: 0;
        }
        
        .text-gradient {
          background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* Footer Links */
        .footer-link {
          color: #71717a;
          text-decoration: none;
          font-size: 0.82rem;
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
        
        /* Custom Scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>

      {/* Decorative Blur Spheres */}
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>

      {/* Main Content Area */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '860px', margin: '0 auto' }}>
        
        {/* Header / Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', marginBottom: '8px' }}>
          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.75rem',
              fontWeight: 800,
              color: '#10b981',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.22)',
              padding: '8px 20px',
              borderRadius: '100px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)',
              cursor: 'default',
              userSelect: 'none'
            }}>
            <Sparkles size={14} color="#10b981" />
            Campus-Groovelab
          </div>
          
          <h1 className="text-gradient" style={{
            fontSize: 'clamp(2.2rem, 4.5vw, 3.8rem)',
            fontWeight: 800,
            margin: '0',
            letterSpacing: '-0.03em',
            lineHeight: 1.15
          }}>
            Finde deine Musikschule
          </h1>
          
          <p style={{
            fontSize: '1.05rem',
            color: '#94a3b8',
            maxWidth: '520px',
            margin: '0 auto',
            lineHeight: 1.6,
            fontWeight: 400
          }}>
            Wähle das Profil deiner Musikschule und starte direkt in deinen Unterricht, Aufgaben und Repertoire.
          </p>
        </div>

        {/* Magic Spotlight Search */}
        <div className="magic-search-container" ref={searchContainerRef}>
          <div className="magic-search-input-wrapper">
            <input
              ref={searchInputRef}
              type="text"
              className="magic-search-input"
              placeholder="Name oder Stadt deiner Musikschule..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
                setFocusedIndex(-1);
              }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={handleKeyDownSearch}
              aria-label="Name oder Stadt deiner Musikschule"
              aria-autocomplete="list"
              aria-expanded={showDropdown}
            />
            <div className="magic-search-left-icon">
              {isSearching ? <Loader2 size={22} className="animate-spin" /> : <Search size={22} />}
            </div>
            {searchQuery && (
              <button 
                type="button"
                className="magic-search-clear-btn"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                title="Suche leeren"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Quick Filter Chips */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            marginTop: '16px'
          }}>
            <button 
              type="button"
              className={`filter-chip ${selectedModuleFilter === 'all' ? 'active-all' : ''}`}
              onClick={() => setSelectedModuleFilter('all')}
            >
              <Building2 size={13} />
              Alle Schulen ({allSchools.length || FALLBACK_SCHOOLS.length})
            </button>
            <button 
              type="button"
              className={`filter-chip ${selectedModuleFilter === 'campus' ? 'active-campus' : ''}`}
              onClick={() => setSelectedModuleFilter('campus')}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34a853' }} />
              Campus
            </button>
            <button 
              type="button"
              className={`filter-chip ${selectedModuleFilter === 'groovelab' ? 'active-groovelab' : ''}`}
              onClick={() => setSelectedModuleFilter('groovelab')}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#eab308' }} />
              GrooveLab
            </button>
          </div>

          {/* Spotlight Results Dropdown (Active when focused & typing) */}
          <div className={`search-results-dropdown ${showDropdown && searchQuery.trim().length > 0 ? 'visible' : ''}`}>
            {searchResults.length > 0 ? (
              searchResults.map((school, index) => {
                const isLastVisited = lastVisitedSchoolId === school.id;
                const isFocused = focusedIndex === index;
                return (
                  <div 
                    key={school.id} 
                    className={`search-result-item ${isFocused ? 'focused' : ''}`}
                    onClick={() => handleSchoolSelect(school)}
                    onMouseEnter={() => setFocusedIndex(index)}
                  >
                    {school.logo_url ? (
                      <img src={school.logo_url} alt={school.name} className="school-logo-image" />
                    ) : (
                      <div className="school-logo-placeholder">
                        <School size={24} style={{ opacity: 0.6 }} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', wordBreak: 'break-word' }}>
                          {school.name}
                        </span>
                        {isLastVisited && (
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            color: '#38bdf8',
                            background: 'rgba(56, 189, 248, 0.12)',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            <Clock size={10} />
                            Zuletzt besucht
                          </span>
                        )}
                        {school.has_campus_subscription && (
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            color: '#34a853',
                            background: 'rgba(52, 168, 83, 0.12)',
                            border: '1px solid rgba(52, 168, 83, 0.25)',
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
                            background: 'rgba(234, 179, 8, 0.12)',
                            border: '1px solid rgba(234, 179, 8, 0.25)',
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
                        <div style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} />
                          {school.city}
                        </div>
                      )}
                    </div>
                    <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', paddingLeft: '8px' }}>
                      <ArrowRight size={18} />
                    </div>
                  </div>
                );
              })
            ) : !isSearching ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', color: '#71717a' }}>
                <School size={28} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '2px' }}>Keine Schule gefunden</div>
                <div style={{ fontSize: '0.82rem' }}>Überprüfe die Schreibweise oder frage deine Musikschule.</div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Directory Section Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '44px',
          marginBottom: '14px',
          padding: '0 4px',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={18} color="#10b981" />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.01em' }}>
              {searchQuery.trim() ? `Suchergebnisse (${searchResults.length})` : 'Verfügbare Musikschulen'}
            </h2>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
            {searchResults.length} {searchResults.length === 1 ? 'Schule' : 'Schulen'}
          </span>
        </div>

        {/* Responsive School Directory Cards (Always Accessible & Scrollable) */}
        {searchResults.length > 0 ? (
          <div className="school-card-grid">
            {searchResults.map((school) => {
              const isLastVisited = lastVisitedSchoolId === school.id;
              return (
                <div
                  key={`card-${school.id}`}
                  className="school-card-item"
                  onClick={() => handleSchoolSelect(school)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSchoolSelect(school);
                    }
                  }}
                >
                  {school.logo_url ? (
                    <img src={school.logo_url} alt={school.name} className="school-logo-image" />
                  ) : (
                    <div className="school-logo-placeholder">
                      <School size={24} style={{ opacity: 0.6 }} />
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.3 }}>
                        {school.name}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {isLastVisited && (
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          color: '#38bdf8',
                          background: 'rgba(56, 189, 248, 0.12)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          <Clock size={10} />
                          Zuletzt besucht
                        </span>
                      )}
                      {school.has_campus_subscription && (
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          color: '#34a853',
                          background: 'rgba(52, 168, 83, 0.12)',
                          border: '1px solid rgba(52, 168, 83, 0.25)',
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
                          background: 'rgba(234, 179, 8, 0.12)',
                          border: '1px solid rgba(234, 179, 8, 0.25)',
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
                      <div style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                        <MapPin size={12} />
                        {school.city}
                      </div>
                    )}
                  </div>

                  <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}>
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            background: 'rgba(20, 20, 25, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '48px 24px',
            textAlign: 'center',
            marginTop: '16px'
          }}>
            <School size={36} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 6px 0', color: '#ffffff' }}>
              Keine Musikschule gefunden
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: '380px', margin: '0 auto 16px auto', lineHeight: 1.5 }}>
              Für Ihre Suchanfrage „{searchQuery}“ wurden keine Ergebnisse gefunden.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedModuleFilter('all');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={14} />
              Filter & Suche zurücksetzen
            </button>
          </div>
        )}

      </div>

      {/* Footer Navigation (Natural Page Flow) */}
      <footer style={{
        marginTop: 'auto',
        paddingTop: '64px',
        paddingBottom: '16px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '24px',
        flexWrap: 'wrap',
        zIndex: 10,
        width: '100%'
      }}>
        <div className="footer-link" onClick={() => triggerProtectedRegistration()}>
          <School size={14} />
          Als Schule registrieren
        </div>
        <div style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.12)' }}></div>
        <div className="footer-link" onClick={() => onShowPrivacy?.()}>Datenschutz</div>
        <div className="footer-link" onClick={() => onShowAgb?.()}>AGB</div>
        <div className="footer-link" onClick={() => onShowImpressum?.()}>Impressum</div>
      </footer>

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

export const LandingPage2 = Startseite;
export const LandingPage = Startseite;
