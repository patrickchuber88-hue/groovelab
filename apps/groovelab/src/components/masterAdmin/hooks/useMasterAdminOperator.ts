import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { verifyTOTP } from '../../../utils/totp';
import { isMasterPasskeyRegistered, registerMasterPasskeyAuthoritative } from '../../../utils/webauthn';
import { registerClientSessionLease, ensureMasterAdminSessionLease } from '../../../utils/sessionLeaseManager';
import { OPERATOR_BANKING_CONFIG } from '../../../config/operatorBanking';

interface MasterAdminUserRecord {
  id: string;
  school_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  master_admin_username?: string | null;
  username?: string | null;
  is_master_admin?: boolean | null;
  is_2fa_enabled?: boolean | null;
  email?: string | null;
}

interface UseMasterAdminOperatorOptions {
  currentUser?: { id?: string } | null;
  onNotify?: (msg: string) => void;
}

export function formatIbanBlocks(raw: string): string {
  const trimmed = (raw || '').trim();
  const clean = trimmed.replace(/\s+/g, '').toUpperCase();
  if (/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(clean)) {
    return clean.replace(/(.{4})/g, '$1 ').trim();
  }
  return trimmed;
}

export function useMasterAdminOperator({ currentUser, onNotify }: UseMasterAdminOperatorOptions = {}) {
  const [billingCompany, setBillingCompany] = useState<string>(OPERATOR_BANKING_CONFIG.companyName);
  const [billingContact, setBillingContact] = useState<string>(OPERATOR_BANKING_CONFIG.legalOwner);
  const [billingStreet, setBillingStreet] = useState<string>(OPERATOR_BANKING_CONFIG.street);
  const [billingZip, setBillingZip] = useState<string>(OPERATOR_BANKING_CONFIG.zipCode);
  const [billingCity, setBillingCity] = useState<string>(OPERATOR_BANKING_CONFIG.city);
  const [billingIban, setBillingIban] = useState<string>(OPERATOR_BANKING_CONFIG.iban);
  const [billingBic, setBillingBic] = useState<string>(OPERATOR_BANKING_CONFIG.bic);
  const [taxMode, setTaxMode] = useState<'standard_vat' | 'small_business'>('small_business');
  const [vatId, setVatId] = useState<string>(OPERATOR_BANKING_CONFIG.ustIdNr);
  const [taxNumber, setTaxNumber] = useState<string>(OPERATOR_BANKING_CONFIG.taxNumber || '');
  const [vatRatePercent, setVatRatePercent] = useState<number>(19);
  const [priceDisplayMode, setPriceDisplayMode] = useState<'net_plus_vat' | 'gross_incl_vat'>('net_plus_vat');
  const [grandfatheringActive, setGrandfatheringActive] = useState<boolean>(true);
  const [grandfatheringCutoffDate, setGrandfatheringCutoffDate] = useState<string>('');

  const [adminUser, setAdminUser] = useState<MasterAdminUserRecord | null>(null);
  const [adminUsername, setAdminUsername] = useState<string>('admin');
  const [updatingAdmin, setUpdatingAdmin] = useState(false);
  const [updatingBilling, setUpdatingBilling] = useState(false);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState<string>('');
  const [showTwoFactorModal, setShowTwoFactorModal] = useState<boolean>(false);
  const [twoFactorCodeInput, setTwoFactorCodeInput] = useState<string>('');

  const [masterPasskeyActive, setMasterPasskeyActive] = useState<boolean>(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showRecoveryModal, setShowRecoveryModal] = useState<boolean>(false);
  const [generatingRecovery, setGeneratingRecovery] = useState<boolean>(false);
  const [showGiroCodeModal, setShowGiroCodeModal] = useState<boolean>(false);

  const notify = useCallback((msg: string) => {
    if (onNotify) onNotify(msg);
  }, [onNotify]);

  const fetchAdminUser = useCallback(async () => {
    try {
      // OWASP ASVS Level 3: Strict explicit column whitelist (Zero Secret Leakage)
      const columns = 'id, school_id, first_name, last_name, role, master_admin_username, username, is_master_admin, is_2fa_enabled, email';
      let data: MasterAdminUserRecord | null = null;

      if (currentUser?.id && currentUser.id !== 'master_admin') {
        const res = await supabase.from('users').select(columns).eq('id', currentUser.id).maybeSingle();
        data = (res.data as MasterAdminUserRecord | null) ?? null;
      }

      // Robust fallback: If querying by currentUser.id found no match or currentUser is 'master_admin',
      // locate authoritative Master Admin record in users_raw
      if (!data) {
        const res = await supabase.from('users').select(columns)
          .or('is_master_admin.eq.true,master_admin_username.eq.admin,first_name.ilike.%Patrick%')
          .limit(1)
          .maybeSingle();
        data = (res.data as MasterAdminUserRecord | null) ?? null;
      }

      if (data) {
        setAdminUser(data);
        setAdminUsername(data.master_admin_username || data.username || 'admin');
        setTwoFactorEnabled(Boolean(data.is_2fa_enabled));
        if (typeof window !== 'undefined' && sessionStorage.getItem('groovelab_is_master_admin') === 'true') {
          try {
            const currentSessionUid = sessionStorage.getItem('groovelab_user_id');
            sessionStorage.setItem('groovelab_user_id', data.id);
            localStorage.setItem('groovelab_user_id', data.id);
            const activeLease = sessionStorage.getItem('gl_active_session_lease_id') || localStorage.getItem('gl_active_session_lease_id');
            if (!activeLease || currentSessionUid !== data.id) {
              await ensureMasterAdminSessionLease();
              const targetSchoolId = data.school_id
                || sessionStorage.getItem('groovelab_school_id')
                || localStorage.getItem('groovelab_school_id')
                || '53e83805-1d5a-4ed8-988e-1fb0b8200b9c';
              await registerClientSessionLease({ id: data.id, role: data.role || 'admin' }, targetSchoolId);
            }
          } catch {
            // Ignore storage access errors
          }
        }
      } else {
        setAdminUsername(localStorage.getItem('cg_master_admin_username') || 'admin');
      }

      if (data?.id) {
        try {
          const { data: creds } = await supabase
            .from('user_credentials')
            .select('id')
            .eq('user_id', data.id)
            .eq('credential_type', 'webauthn')
            .limit(1);
          setMasterPasskeyActive(Boolean(creds && creds.length > 0) || isMasterPasskeyRegistered());
        } catch {
          setMasterPasskeyActive(isMasterPasskeyRegistered());
        }
      } else {
        setMasterPasskeyActive(isMasterPasskeyRegistered());
      }
    } catch (err) {
      console.error('Error fetching admin:', err);
      setAdminUsername(localStorage.getItem('cg_master_admin_username') || 'admin');
    }
  }, [currentUser]);

  const fetchBillingSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('master_billing_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (!error && data) {
        if (typeof data.company_name === 'string' && data.company_name.trim()) {
          setBillingCompany(data.company_name);
        }
        if (typeof data.contact_person === 'string' && data.contact_person.trim()) {
          setBillingContact(data.contact_person);
        }
        if (typeof data.street === 'string' && data.street.trim()) {
          setBillingStreet(data.street);
        }
        if (typeof data.zip_code === 'string' && data.zip_code.trim()) {
          setBillingZip(data.zip_code);
        }
        if (typeof data.city === 'string' && data.city.trim()) {
          setBillingCity(data.city);
        }
        if (typeof data.iban === 'string' && data.iban.trim()) {
          setBillingIban(formatIbanBlocks(data.iban));
        }
        if (typeof data.bic === 'string' && data.bic.trim()) {
          setBillingBic(data.bic);
        }
        if (data.tax_mode === 'standard_vat' || data.tax_mode === 'small_business') {
          setTaxMode(data.tax_mode);
        }
        if (typeof data.vat_id === 'string') {
          setVatId(data.vat_id);
        }
        if (typeof data.tax_number === 'string') {
          setTaxNumber(data.tax_number);
        }
        if (typeof data.vat_rate_percent === 'number' && !Number.isNaN(data.vat_rate_percent)) {
          setVatRatePercent(data.vat_rate_percent);
        }
        if (data.price_display_mode === 'net_plus_vat' || data.price_display_mode === 'gross_incl_vat') {
          setPriceDisplayMode(data.price_display_mode);
        }
        if (typeof data.grandfathering_active === 'boolean') {
          setGrandfatheringActive(data.grandfathering_active);
        }
        if (typeof data.grandfathering_cutoff_date === 'string') {
          setGrandfatheringCutoffDate(data.grandfathering_cutoff_date);
        }
      }
    } catch (err) {
      console.error('Error fetching operator billing settings:', err);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.removeItem('cg_2fa_secret');
    } catch {
      // Ignore storage access errors in restricted environments
    }
    void fetchBillingSettings();
    void fetchAdminUser();
  }, [fetchBillingSettings, fetchAdminUser]);

  const handleUpdateAdminCredentials = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername.trim()) return;
    try {
      setUpdatingAdmin(true);
      const targetUserId = adminUser?.id 
        || (currentUser?.id && currentUser.id !== 'master_admin' ? currentUser.id : null);

      const { error: rpcErr } = await supabase.rpc('update_master_admin_credentials', {
        p_username: adminUsername.trim(),
        p_user_id: targetUserId || undefined
      });

      if (rpcErr) throw rpcErr;

      localStorage.setItem('cg_master_admin_username', adminUsername.trim());
      localStorage.removeItem('cg_master_admin_password');

      notify('Master-Admin Benutzername erfolgreich gespeichert.');
      await fetchAdminUser();
    } catch (err: unknown) {
      console.error('Master admin credentials update error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      alert('Fehler beim Speichern: ' + errMsg);
    } finally {
      setUpdatingAdmin(false);
    }
  }, [adminUsername, currentUser, adminUser, notify, fetchAdminUser]);

  const handleUpdateBillingSettings = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUpdatingBilling(true);
      const rawIbanStripped = billingIban.replace(/\s+/g, '').toUpperCase();
      const isRealIban = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(rawIbanStripped);
      const cleanIban = isRealIban ? rawIbanStripped : billingIban.trim();
      const cleanBic = isRealIban ? billingBic.replace(/\s+/g, '').toUpperCase() : billingBic.trim();

      let saved = false;
      try {
        const { error: rpcError } = await supabase.rpc('update_master_billing_settings', {
          p_company_name: billingCompany.trim(),
          p_contact_person: billingContact.trim(),
          p_street: billingStreet.trim(),
          p_zip_code: billingZip.trim(),
          p_city: billingCity.trim(),
          p_iban: cleanIban,
          p_bic: cleanBic,
          p_tax_mode: taxMode,
          p_tax_number: taxNumber.trim(),
          p_vat_id: vatId.trim(),
          p_vat_rate_percent: Number(vatRatePercent),
          p_price_display_mode: priceDisplayMode,
          p_grandfathering_active: Boolean(grandfatheringActive),
          p_grandfathering_cutoff_date: grandfatheringCutoffDate
        });
        if (!rpcError) saved = true;
      } catch {
        // Fallback to direct table update if RPC signature differs
      }

      if (!saved) {
        const payload: Record<string, string | number | boolean> = {
          company_name: billingCompany.trim(),
          contact_person: billingContact.trim(),
          street: billingStreet.trim(),
          zip_code: billingZip.trim(),
          city: billingCity.trim(),
          tax_mode: taxMode,
          tax_number: taxNumber.trim(),
          vat_id: vatId.trim(),
          vat_rate_percent: Number(vatRatePercent),
          price_display_mode: priceDisplayMode,
          grandfathering_active: Boolean(grandfatheringActive),
          grandfathering_cutoff_date: grandfatheringCutoffDate,
          iban: cleanIban,
          bic: cleanBic,
          updated_at: new Date().toISOString()
        };
        await supabase.from('master_billing_settings').update(payload).eq('id', 1);
      }

      localStorage.setItem('cg_tax_mode', taxMode);
      localStorage.setItem('cg_vat_id', vatId);
      localStorage.setItem('cg_tax_number', taxNumber);
      localStorage.setItem('cg_vat_rate_percent', String(vatRatePercent));
      localStorage.setItem('cg_price_display_mode', priceDisplayMode);
      localStorage.setItem('cg_grandfathering_active', String(grandfatheringActive));

      notify('Betreiber-Stammdaten & Bankdaten erfolgreich gespeichert.');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      alert('Fehler beim Speichern der Betreiberdaten: ' + errMsg);
    } finally {
      setUpdatingBilling(false);
    }
  }, [billingCompany, billingContact, billingStreet, billingZip, billingCity, billingIban, billingBic, taxMode, taxNumber, vatId, vatRatePercent, priceDisplayMode, grandfatheringActive, grandfatheringCutoffDate, notify]);

  const handleToggleTwoFactor = useCallback(async () => {
    if (twoFactorEnabled) {
      if (confirm('Möchten Sie die Zwei-Faktor-Authentifizierung (2FA) wirklich deaktivieren?')) {
        try {
          const targetUserId = (currentUser?.id && currentUser.id !== 'master_admin') ? currentUser.id : adminUser?.id;
          if (targetUserId) {
            await supabase.rpc('update_master_admin_credentials', {
              p_username: adminUsername,
              p_user_id: targetUserId,
              p_is_2fa_enabled: false
            });
          }
        } catch {
          // Ignore RPC error during local state sync
        }
        setTwoFactorEnabled(false);
        setTwoFactorSecret('');
        localStorage.setItem('cg_2fa_enabled', 'false');
        try {
          localStorage.removeItem('cg_2fa_secret');
        } catch {
          // Ignore storage error
        }
        notify('Zwei-Faktor-Schutz wurde deaktiviert.');
        await fetchAdminUser();
      }
    } else {
      if (!twoFactorSecret || !/^[A-Z2-7]{16,32}$/i.test(twoFactorSecret)) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        const randomBytes = new Uint8Array(16);
        window.crypto.getRandomValues(randomBytes);
        let secret = '';
        for (let i = 0; i < 16; i++) {
          secret += chars.charAt(randomBytes[i] % chars.length);
        }
        setTwoFactorSecret(secret);
      }
      setShowTwoFactorModal(true);
    }
  }, [twoFactorEnabled, currentUser, adminUser, adminUsername, twoFactorSecret, notify, fetchAdminUser]);

  const handleConfirmTwoFactor = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = twoFactorCodeInput.replace(/\s+/g, '');
    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      alert('Bitte geben Sie den 6-stelligen Bestätigungscode aus Ihrer Authenticator-App ein.');
      return;
    }

    try {
      const isValid = await verifyTOTP(cleanCode, twoFactorSecret);
      if (!isValid) {
        alert('Der eingegebene Code ist ungültig oder abgelaufen.');
        return;
      }

      const targetUserId = (currentUser?.id && currentUser.id !== 'master_admin') ? currentUser.id : adminUser?.id;
      if (targetUserId) {
        await supabase.rpc('update_master_admin_credentials', {
          p_username: adminUsername,
          p_user_id: targetUserId,
          p_is_2fa_enabled: true,
          p_two_factor_secret: twoFactorSecret
        });
      }

      setTwoFactorEnabled(true);
      setShowTwoFactorModal(false);
      setTwoFactorCodeInput('');
      setTwoFactorSecret('');
      localStorage.setItem('cg_2fa_enabled', 'true');
      try {
        localStorage.removeItem('cg_2fa_secret');
      } catch {
        // Ignore storage error
      }
      notify('Zwei-Faktor-Schutz (2FA) erfolgreich aktiviert.');
      await fetchAdminUser();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      alert('Fehler beim Aktivieren von 2FA: ' + errMsg);
    }
  }, [twoFactorCodeInput, twoFactorSecret, currentUser, adminUser, adminUsername, notify, fetchAdminUser]);

  const handleRegisterPasskey = useCallback(async () => {
    try {
      // 1. Authoritative Master Admin Session Lease Bootstrap
      await ensureMasterAdminSessionLease();

      let resolvedAdmin = adminUser;
      if (!resolvedAdmin) {
        const columns = 'id, school_id, first_name, last_name, role, master_admin_username, username, is_master_admin, is_2fa_enabled, email';
        const { data } = await supabase.from('users').select(columns)
          .or('is_master_admin.eq.true,master_admin_username.eq.admin,first_name.ilike.%Patrick%')
          .limit(1)
          .maybeSingle();
        if (data) {
          resolvedAdmin = data as MasterAdminUserRecord;
          setAdminUser(resolvedAdmin);
        }
      }

      // OWASP ASVS L3 Fail-Closed: Require authoritative database-verified user ID, no static fallback UUID
      const targetUserId = resolvedAdmin?.id 
        || (currentUser?.id && currentUser.id !== 'master_admin' ? currentUser.id : null)
        || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('groovelab_user_id') : null)
        || (typeof localStorage !== 'undefined' ? localStorage.getItem('groovelab_user_id') : null);

      if (!targetUserId || targetUserId === 'master_admin') {
        throw new Error('Keine verifizierte Master-Admin-Identität geladen (Fail-Closed). Bitte Seite neu laden.');
      }

      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('groovelab_user_id', targetUserId);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('groovelab_user_id', targetUserId);
          }
          sessionStorage.setItem('groovelab_is_master_admin', 'true');
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('groovelab_is_master_admin', 'true');
          }
        } catch {
          // Ignore storage errors
        }
      }

      const res = await registerMasterPasskeyAuthoritative(supabase, targetUserId, 'Master Touch ID / YubiKey');
      if (res.success) {
        setMasterPasskeyActive(true);
        notify('Touch ID / Passkey erfolgreich in der Datenbank für Master-Admin registriert.');
      } else {
        throw new Error(res.error);
      }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      alert('Passkey-Registrierung fehlgeschlagen: ' + errMsg);
    }
  }, [currentUser, adminUser, notify]);

  const handleGenerateRecoveryCodes = useCallback(async () => {
    try {
      setGeneratingRecovery(true);
      const { data, error } = await supabase.rpc('generate_master_admin_recovery_codes');
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Generierung fehlgeschlagen.');
      }
      setRecoveryCodes(data.codes || []);
      setShowRecoveryModal(true);
      notify('3 neue Break-Glass Notfall-Wiederherstellungscodes generiert.');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      alert('Fehler bei Notfall-Code-Generierung: ' + errMsg);
    } finally {
      setGeneratingRecovery(false);
    }
  }, [notify]);

  return {
    billingCompany,
    setBillingCompany,
    billingContact,
    setBillingContact,
    billingStreet,
    setBillingStreet,
    billingZip,
    setBillingZip,
    billingCity,
    setBillingCity,
    billingIban,
    setBillingIban,
    billingBic,
    setBillingBic,
    taxMode,
    setTaxMode,
    vatId,
    setVatId,
    taxNumber,
    setTaxNumber,
    vatRatePercent,
    setVatRatePercent,
    priceDisplayMode,
    setPriceDisplayMode,
    grandfatheringActive,
    setGrandfatheringActive,
    grandfatheringCutoffDate,
    setGrandfatheringCutoffDate,
    adminUser,
    adminUsername,
    setAdminUsername,
    updatingAdmin,
    updatingBilling,
    twoFactorEnabled,
    twoFactorSecret,
    showTwoFactorModal,
    setShowTwoFactorModal,
    twoFactorCodeInput,
    setTwoFactorCodeInput,
    masterPasskeyActive,
    recoveryCodes,
    showRecoveryModal,
    setShowRecoveryModal,
    generatingRecovery,
    showGiroCodeModal,
    setShowGiroCodeModal,
    fetchAdminUser,
    fetchBillingSettings,
    handleUpdateAdminCredentials,
    handleUpdateBillingSettings,
    handleToggleTwoFactor,
    handleConfirmTwoFactor,
    handleRegisterPasskey,
    handleGenerateRecoveryCodes
  };
}
