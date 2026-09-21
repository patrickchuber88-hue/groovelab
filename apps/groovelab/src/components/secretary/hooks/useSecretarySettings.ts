import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  isWebAuthnSupported,
  registerUserBiometrics,
  authenticateUserBiometrics,
  getStoredBiometricProfiles,
  removeBiometricProfile,
  BiometricVaultProfile
} from '../../../utils/webauthn';

export interface UseSecretarySettingsOptions {
  schoolId: string;
  userId: string;
  currentUserProfile?: any;
  currentSchoolProfile?: any;
  setCurrentSchoolProfile?: (profile: any) => void;
  fetchDashboardData?: () => Promise<void> | void;
}

export function useSecretarySettings({
  schoolId,
  userId,
  currentUserProfile,
  currentSchoolProfile,
  setCurrentSchoolProfile,
  fetchDashboardData
}: UseSecretarySettingsOptions) {
  // 1. School Master Data
  const [schoolName, setSchoolName] = useState<string>('');
  const [schoolSubdomain, setSchoolSubdomain] = useState<string>('');
  const [schoolZipCode, setSchoolZipCode] = useState<string>('');
  const [schoolCity, setSchoolCity] = useState<string>('');
  const [schoolStreet, setSchoolStreet] = useState<string>('');
  const [schoolHouseNumber, setSchoolHouseNumber] = useState<string>('');
  const [schoolPhoneNumber, setSchoolPhoneNumber] = useState<string>('');
  const [schoolEmail, setSchoolEmail] = useState<string>('');
  const [absenceEmail, setAbsenceEmail] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [openingHours, setOpeningHours] = useState<any>(null);

  // 2. Operational & Kiosk Settings
  const [kioskPinLength, setKioskPinLength] = useState<number>(4);
  const [bypassPin, setBypassPin] = useState<string>('1234');
  const [logRetention, setLogRetention] = useState<string>('90');
  const [syncInterval, setSyncInterval] = useState<string>('daily');
  const [calendarUrls, setCalendarUrls] = useState<string[]>([]);
  const [newCalendarUrlInput, setNewCalendarUrlInput] = useState<string>('');

  // 3. School Year & Expiry Clean
  const [schoolYearStartMonth, setSchoolYearStartMonth] = useState<number>(9);
  const [schoolYearStartDay, setSchoolYearStartDay] = useState<number>(1);
  const [autoDeleteExpiredUsers, setAutoDeleteExpiredUsers] = useState<boolean>(false);

  // 4. Dirty State & Initial Baseline
  const [initialSettings, setInitialSettings] = useState<any>(null);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);

  // 5. Settings Modals & Navigation Sub-States
  const [activeSecretarySettingsModal, setActiveSecretarySettingsModal] = useState<'general' | 'links' | 'sync' | 'security_privacy' | 'backup' | 'school_year' | 'danger_zone' | null>(null);
  const [settingsTab, setSettingsTab] = useState<'general' | 'sync' | 'security_privacy' | 'backup'>('general');
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [resetConfirmText, setResetConfirmText] = useState<string>('');
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // 6. Clipboard Feedback States
  const [copiedSettingsPin, setCopiedSettingsPin] = useState<boolean>(false);
  const [copiedSettingsLink, setCopiedSettingsLink] = useState<boolean>(false);
  const [copiedKioskLink, setCopiedKioskLink] = useState<boolean>(false);
  const [copiedSchoolLink, setCopiedSchoolLink] = useState<boolean>(false);

  // 7. Biometrics & WebAuthn States
  const [biometricsStatus, setBiometricsStatus] = useState<'idle' | 'registering' | 'verifying' | 'success' | 'error'>('idle');
  const [biometricsMessage, setBiometricsMessage] = useState<string>('');
  const [localPasskeyProfiles, setLocalPasskeyProfiles] = useState<BiometricVaultProfile[]>(() => getStoredBiometricProfiles());

  const isCurrentDevicePasskeyActive = useMemo(() => {
    if (!currentUserProfile?.id) return false;
    return localPasskeyProfiles.some(p => p.userId === currentUserProfile.id);
  }, [localPasskeyProfiles, currentUserProfile?.id]);

  // 8. Disaster Recovery / Backup & Restore States
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(`groovelab_last_backup_${schoolId}`);
  });

  const daysSinceLastBackup = useMemo(() => {
    if (!lastBackupDate) return null;
    const lastDate = new Date(lastBackupDate);
    const diffTime = Math.abs(new Date().getTime() - lastDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [lastBackupDate]);

  const showBackupAlert = useMemo(() => {
    return !lastBackupDate || (daysSinceLastBackup !== null && daysSinceLastBackup > 14);
  }, [lastBackupDate, daysSinceLastBackup]);

  // 9. Computed Dirty State Check
  const isSettingsDirty = useMemo(() => {
    if (!initialSettings) return false;
    return (
      schoolName !== initialSettings.schoolName ||
      schoolSubdomain !== initialSettings.schoolSubdomain ||
      schoolZipCode !== initialSettings.schoolZipCode ||
      schoolCity !== initialSettings.schoolCity ||
      schoolStreet !== initialSettings.schoolStreet ||
      schoolHouseNumber !== initialSettings.schoolHouseNumber ||
      schoolPhoneNumber !== initialSettings.schoolPhoneNumber ||
      schoolEmail !== initialSettings.schoolEmail ||
      absenceEmail !== initialSettings.absenceEmail ||
      logoUrl !== initialSettings.logoUrl ||
      JSON.stringify(calendarUrls) !== JSON.stringify(initialSettings.calendarUrls) ||
      kioskPinLength !== initialSettings.kioskPinLength ||
      bypassPin !== initialSettings.bypassPin ||
      logRetention !== initialSettings.logRetention ||
      syncInterval !== initialSettings.syncInterval ||
      schoolYearStartMonth !== initialSettings.schoolYearStartMonth ||
      schoolYearStartDay !== initialSettings.schoolYearStartDay ||
      autoDeleteExpiredUsers !== initialSettings.autoDeleteExpiredUsers
    );
  }, [
    initialSettings,
    schoolName, schoolSubdomain, schoolZipCode, schoolCity, schoolStreet, schoolHouseNumber, schoolPhoneNumber, schoolEmail, absenceEmail,
    logoUrl, calendarUrls, kioskPinLength, bypassPin, logRetention, syncInterval,
    schoolYearStartMonth, schoolYearStartDay, autoDeleteExpiredUsers
  ]);

  // 10. Initializer from School Data Record
  const initSettingsFromSchool = useCallback((schoolData: any) => {
    if (!schoolData) return;
    setSchoolName(schoolData.name || '');
    setSchoolSubdomain(schoolData.subdomain || '');
    setSchoolZipCode(schoolData.zip_code || '');
    setSchoolCity(schoolData.city || '');
    setSchoolStreet(schoolData.street || '');
    setSchoolHouseNumber(schoolData.house_number || '');
    setSchoolPhoneNumber(schoolData.phone_number || '');
    setSchoolEmail(schoolData.email || '');
    setAbsenceEmail(schoolData.absence_email || '');
    setLogoUrl(schoolData.logo_url || '');

    const op = schoolData.opening_hours || {};
    setOpeningHours(op);

    let parsedUrls: string[] = [];
    const rawUrl = schoolData.calendar_url;
    try {
      if (rawUrl) {
        if (rawUrl.startsWith('[') && rawUrl.endsWith(']')) {
          parsedUrls = JSON.parse(rawUrl);
        } else {
          parsedUrls = [rawUrl];
        }
      }
    } catch {
      if (rawUrl) parsedUrls = [rawUrl];
    }
    setCalendarUrls(parsedUrls);

    const loadedKioskPinLength = op.kiosk_pin_length || 4;
    const loadedBypassPin = op.bypass_pin || '1234';
    const loadedLogRetention = op.log_retention || '90';
    const loadedSyncInterval = op.sync_interval || 'daily';

    setKioskPinLength(loadedKioskPinLength);
    setBypassPin(loadedBypassPin);
    setLogRetention(loadedLogRetention);
    setSyncInterval(loadedSyncInterval);

    const loadedStartMonth = Number(schoolData.school_year_start_month || op.school_year_start_month || 9);
    const loadedStartDay = Number(schoolData.school_year_start_day || op.school_year_start_day || 1);
    const loadedAutoDelete = Boolean(schoolData.auto_delete_expired_users === true || op.auto_delete_expired_users === true || op.auto_delete_expired_users === 'true');

    setSchoolYearStartMonth(loadedStartMonth);
    setSchoolYearStartDay(loadedStartDay);
    setAutoDeleteExpiredUsers(loadedAutoDelete);

    setInitialSettings({
      schoolName: schoolData.name || '',
      schoolSubdomain: schoolData.subdomain || '',
      schoolZipCode: schoolData.zip_code || '',
      schoolCity: schoolData.city || '',
      schoolStreet: schoolData.street || '',
      schoolHouseNumber: schoolData.house_number || '',
      schoolPhoneNumber: schoolData.phone_number || '',
      schoolEmail: schoolData.email || '',
      absenceEmail: schoolData.absence_email || '',
      logoUrl: schoolData.logo_url || '',
      calendarUrls: parsedUrls,
      kioskPinLength: loadedKioskPinLength,
      bypassPin: loadedBypassPin,
      logRetention: loadedLogRetention,
      syncInterval: loadedSyncInterval,
      schoolYearStartMonth: loadedStartMonth,
      schoolYearStartDay: loadedStartDay,
      autoDeleteExpiredUsers: loadedAutoDelete
    });
  }, []);

  // 11. Handlers for Discrete Setting Toggles
  const handleToggleSetting = async (key: string, value: boolean, setter: (val: boolean) => void) => {
    setter(value);
    try {
      const currentOp = openingHours || {};
      const updatedOp = { ...currentOp, [key]: value };
      setOpeningHours(updatedOp);
      if (schoolId) {
        await supabase.from('schools').update({ opening_hours: updatedOp }).eq('id', schoolId);
      }
    } catch (err) {
      console.error('Error saving setting:', err);
    }
  };

  const handleSaveSettingValue = async (key: string, value: any, setter?: (val: any) => void) => {
    if (setter) setter(value);
    try {
      const currentOp = openingHours || {};
      const updatedOp = { ...currentOp, [key]: value };
      setOpeningHours(updatedOp);
      if (schoolId) {
        await supabase.from('schools').update({ opening_hours: updatedOp }).eq('id', schoolId);
      }
    } catch (err) {
      console.error('Error saving setting value:', err);
    }
  };

  const handleToggleAutoClean = async (nextVal: boolean) => {
    setAutoDeleteExpiredUsers(nextVal);
    setInitialSettings((prev: any) => prev ? ({ ...prev, autoDeleteExpiredUsers: nextVal }) : prev);
    try {
      const currentOp = openingHours || {};
      const updatedOp = { ...currentOp, auto_delete_expired_users: nextVal };
      setOpeningHours(updatedOp);

      try {
        const overridesStr = localStorage.getItem('groovelab_school_overrides') || '{}';
        const overrides = JSON.parse(overridesStr);
        if (schoolId) {
          overrides[schoolId] = {
            ...(overrides[schoolId] || {}),
            auto_delete_expired_users: nextVal,
            opening_hours: updatedOp
          };
          localStorage.setItem('groovelab_school_overrides', JSON.stringify(overrides));
        }
      } catch {}

      if (schoolId) {
        const { error } = await supabase
          .from('schools')
          .update({
            auto_delete_expired_users: nextVal,
            opening_hours: updatedOp
          })
          .eq('id', schoolId);

        if (error) {
          await supabase
            .from('schools')
            .update({
              opening_hours: updatedOp
            })
            .eq('id', schoolId);
        }
      }
    } catch (err) {
      console.error('[SecretarySettings] Error toggling auto-clean:', err);
    }
  };

  const handleUpdateSchoolYear = async (newMonth: number, newDay: number) => {
    setSchoolYearStartMonth(newMonth);
    setSchoolYearStartDay(newDay);
    setInitialSettings((prev: any) => prev ? ({ ...prev, schoolYearStartMonth: newMonth, schoolYearStartDay: newDay }) : prev);

    try {
      const currentOp = openingHours || {};
      const updatedOp = {
        ...currentOp,
        school_year_start_month: newMonth,
        school_year_start_day: newDay,
        auto_delete_expired_users: autoDeleteExpiredUsers
      };
      setOpeningHours(updatedOp);

      try {
        const overridesStr = localStorage.getItem('groovelab_school_overrides') || '{}';
        const overrides = JSON.parse(overridesStr);
        if (schoolId) {
          overrides[schoolId] = {
            ...(overrides[schoolId] || {}),
            school_year_start_month: newMonth,
            school_year_start_day: newDay,
            opening_hours: updatedOp
          };
          localStorage.setItem('groovelab_school_overrides', JSON.stringify(overrides));
        }
      } catch {}

      if (schoolId) {
        const { error } = await supabase
          .from('schools')
          .update({
            school_year_start_month: newMonth,
            school_year_start_day: newDay,
            opening_hours: updatedOp
          })
          .eq('id', schoolId);

        if (error) {
          await supabase
            .from('schools')
            .update({
              opening_hours: updatedOp
            })
            .eq('id', schoolId);
        }
      }
    } catch (err) {
      console.error('[SecretarySettings] Error updating school year start:', err);
    }
  };

  const handleAddCalendarUrl = () => {
    if (!newCalendarUrlInput.trim()) return;
    if (!newCalendarUrlInput.startsWith('http://') && !newCalendarUrlInput.startsWith('https://')) {
      alert('Bitte eine gültige URL (beginnend mit http:// oder https://) eingeben.');
      return;
    }
    if (calendarUrls.includes(newCalendarUrlInput.trim())) {
      alert('Dieser Kalender-Feed ist bereits hinzugefügt.');
      return;
    }
    setCalendarUrls([...calendarUrls, newCalendarUrlInput.trim()]);
    setNewCalendarUrlInput('');
  };

  const handleRemoveCalendarUrl = (indexToRemove: number) => {
    setCalendarUrls(calendarUrls.filter((_, idx) => idx !== indexToRemove));
  };

  // 12. Master Save Handler
  const handleSaveAllSettings = async (customOverrides?: Partial<{ autoDeleteExpiredUsers: boolean; schoolYearStartMonth: number; schoolYearStartDay: number; kioskPinLength: number; bypassPin: string; logRetention: string; syncInterval: string }> | any) => {
    if (!schoolName.trim()) {
      alert('Bitte einen Musikschulnamen eingeben.');
      return;
    }
    setIsSavingSettings(true);
    try {
      const overrides = (customOverrides && typeof customOverrides === 'object' && !('nativeEvent' in customOverrides)) ? customOverrides : undefined;
      const effAutoDelete = overrides?.autoDeleteExpiredUsers !== undefined ? overrides.autoDeleteExpiredUsers : autoDeleteExpiredUsers;
      const effMonth = overrides?.schoolYearStartMonth !== undefined ? overrides.schoolYearStartMonth : schoolYearStartMonth;
      const effDay = overrides?.schoolYearStartDay !== undefined ? overrides.schoolYearStartDay : schoolYearStartDay;
      const effKioskPinLength = overrides?.kioskPinLength !== undefined ? overrides.kioskPinLength : kioskPinLength;
      const effBypassPin = overrides?.bypassPin !== undefined ? overrides.bypassPin : bypassPin;
      const effLogRetention = overrides?.logRetention !== undefined ? overrides.logRetention : logRetention;
      const effSyncInterval = overrides?.syncInterval !== undefined ? overrides.syncInterval : syncInterval;

      const updatedOp = {
        ...(openingHours || {}),
        kiosk_pin_length: effKioskPinLength,
        bypass_pin: effBypassPin,
        log_retention: effLogRetention,
        sync_interval: effSyncInterval,
        school_year_start_month: effMonth,
        school_year_start_day: effDay,
        auto_delete_expired_users: effAutoDelete
      };

      const serializedUrls = JSON.stringify(calendarUrls);

      const updatePayload: any = {
        name: schoolName,
        subdomain: schoolSubdomain || null,
        street: schoolStreet || null,
        house_number: schoolHouseNumber || null,
        zip_code: schoolZipCode || null,
        city: schoolCity || null,
        phone_number: schoolPhoneNumber || null,
        email: schoolEmail || null,
        absence_email: absenceEmail || null,
        logo_url: logoUrl || null,
        calendar_url: serializedUrls || null,
        opening_hours: updatedOp,
        school_year_start_month: effMonth,
        school_year_start_day: effDay,
        auto_delete_expired_users: effAutoDelete
      };

      let { error } = await supabase
        .from('schools')
        .update(updatePayload)
        .eq('id', schoolId);

      if (error) {
        console.warn('[SecretarySettings] Retrying update with opening_hours JSON fallback due to column error:', error);
        const { error: fallbackError } = await supabase
          .from('schools')
          .update({
            name: schoolName,
            subdomain: schoolSubdomain || null,
            street: schoolStreet || null,
            house_number: schoolHouseNumber || null,
            zip_code: schoolZipCode || null,
            city: schoolCity || null,
            phone_number: schoolPhoneNumber || null,
            email: schoolEmail || null,
            absence_email: absenceEmail || null,
            logo_url: logoUrl || null,
            calendar_url: serializedUrls || null,
            opening_hours: updatedOp
          })
          .eq('id', schoolId);
        if (fallbackError) throw fallbackError;
      }

      setOpeningHours(updatedOp);
      setSchoolYearStartMonth(effMonth);
      setSchoolYearStartDay(effDay);
      setAutoDeleteExpiredUsers(effAutoDelete);
      setKioskPinLength(effKioskPinLength);
      setBypassPin(effBypassPin);
      setLogRetention(effLogRetention);
      setSyncInterval(effSyncInterval);

      setInitialSettings({
        schoolName: schoolName || '',
        schoolSubdomain: schoolSubdomain || '',
        schoolZipCode: schoolZipCode || '',
        schoolCity: schoolCity || '',
        schoolStreet: schoolStreet || '',
        schoolHouseNumber: schoolHouseNumber || '',
        schoolPhoneNumber: schoolPhoneNumber || '',
        schoolEmail: schoolEmail || '',
        absenceEmail: absenceEmail || '',
        logoUrl: logoUrl || '',
        calendarUrls: calendarUrls,
        kioskPinLength: effKioskPinLength,
        bypassPin: effBypassPin,
        logRetention: effLogRetention,
        syncInterval: effSyncInterval,
        schoolYearStartMonth: effMonth,
        schoolYearStartDay: effDay,
        autoDeleteExpiredUsers: effAutoDelete
      });

      // Update local storage school profile & groovelab_school_overrides
      try {
        const storedProfile = localStorage.getItem('groovelab_school_profile');
        if (storedProfile) {
          const parsed = JSON.parse(storedProfile);
          parsed.auto_delete_expired_users = effAutoDelete;
          parsed.school_year_start_month = effMonth;
          parsed.school_year_start_day = effDay;
          parsed.opening_hours = updatedOp;
          localStorage.setItem('groovelab_school_profile', JSON.stringify(parsed));
        }
        const overridesStr = localStorage.getItem('groovelab_school_overrides') || '{}';
        const overrides = JSON.parse(overridesStr);
        if (schoolId) {
          overrides[schoolId] = {
            ...(overrides[schoolId] || {}),
            auto_delete_expired_users: effAutoDelete,
            school_year_start_month: effMonth,
            school_year_start_day: effDay,
            opening_hours: updatedOp
          };
          localStorage.setItem('groovelab_school_overrides', JSON.stringify(overrides));
        }
      } catch {}

      if (setCurrentSchoolProfile) {
        setCurrentSchoolProfile((prev: any) => ({
          ...(prev || {}),
          ...updatePayload
        }));
      }

      alert('Einstellungen erfolgreich gespeichert.');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      alert('Fehler beim Speichern der Einstellungen: ' + err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // 13. Biometrics & Passkeys Handlers
  const handleEnrollBiometrics = async () => {
    if (!currentUserProfile) return;
    setBiometricsStatus('registering');
    setBiometricsMessage('');
    try {
      if (!isWebAuthnSupported()) {
        throw new Error('Biometrisches Anmelden (Touch ID / Face ID) wird von diesem Browser/Gerät nicht unterstützt.');
      }
      const email = currentUserProfile.email || `${currentUserProfile.id}@campus-groovelab.de`;
      const profile = await registerUserBiometrics(
        email,
        currentUserProfile.id,
        currentUserProfile.first_name,
        currentUserProfile.last_name || '',
        currentUserProfile.role || 'admin',
        currentUserProfile.id,
        null,
        '/campus_login_hero.png',
        schoolName || 'Musikschule'
      );

      await supabase.from('user_credentials').insert({
        user_id: currentUserProfile.id,
        credential_id: profile.credentialId,
        public_key: JSON.stringify({ registered: true, device: navigator.userAgent }),
        device_name: navigator.userAgent.includes('Mac') ? 'Mac Touch ID' : 'WebAuthn Device'
      });

      setLocalPasskeyProfiles(getStoredBiometricProfiles());
      setBiometricsStatus('success');
      setBiometricsMessage('Touch ID / Face ID wurde erfolgreich für dieses Gerät eingerichtet!');
      setTimeout(() => setBiometricsStatus('idle'), 4000);
    } catch (err: any) {
      console.error('Biometrics enrollment failed:', err);
      setBiometricsStatus('error');
      setBiometricsMessage(err.message || 'Die Einrichtung wurde abgebrochen oder ist fehlgeschlagen.');
    }
  };

  const handleTestBiometrics = async () => {
    if (!currentUserProfile) return;
    setBiometricsStatus('verifying');
    setBiometricsMessage('');
    try {
      await authenticateUserBiometrics(currentUserProfile.id);
      setBiometricsStatus('success');
      setBiometricsMessage('✓ Authentifizierung erfolgreich! Touch ID / Face ID funktioniert einwandfrei.');
      setTimeout(() => setBiometricsStatus('idle'), 4000);
    } catch (err: any) {
      console.error('Biometrics verification failed:', err);
      setBiometricsStatus('error');
      setBiometricsMessage(err.message || 'Die Verifikation ist fehlgeschlagen oder wurde abgebrochen.');
    }
  };

  const handleRemoveBiometrics = () => {
    if (!currentUserProfile?.id) return;
    const confirm = window.confirm('Möchtest du den Touch ID / Face ID Passkey von diesem Gerät entfernen?');
    if (!confirm) return;
    removeBiometricProfile(currentUserProfile.id);
    setLocalPasskeyProfiles(getStoredBiometricProfiles());
    setBiometricsStatus('success');
    setBiometricsMessage('Passkey wurde von diesem Gerät entfernt.');
    setTimeout(() => setBiometricsStatus('idle'), 3000);
  };

  // 14. Reset School to Factory Defaults (Destructive)
  const handleResetSchool = async () => {
    if (resetConfirmText !== schoolName) {
      alert(`Fehler: Bitte geben Sie genau den Namen der Musikschule („${schoolName}“) zur Bestätigung ein.`);
      return;
    }

    setIsResetting(true);
    try {
      const { error } = await supabase.rpc('reset_school_data', {
        p_school_id: schoolId,
        p_admin_id: userId
      });
      if (error) throw error;

      alert('Erfolg: Die Musikschule wurde erfolgreich auf Werkseinstellungen zurückgesetzt! Alle Schüler- und Lehrerdaten wurden gelöscht. Ihr Administrator-Profil ist weiterhin aktiv.');
      setShowResetModal(false);
      setResetConfirmText('');

      if (fetchDashboardData) {
        await fetchDashboardData();
      }
      window.location.reload();
    } catch (err: any) {
      console.error('Error resetting school:', err);
      alert('Fehler beim Zurücksetzen der Musikschule: ' + (err.message || err));
    } finally {
      setIsResetting(false);
    }
  };

  // 15. Disaster Recovery: JSON Backup Export
  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const [
        schoolRes,
        usersRes,
        roomsRes,
        schedulesRes,
        bandsRes,
        studentsRes,
        stationsRes
      ] = await Promise.all([
        supabase.from('schools').select('*').eq('id', schoolId).single(),
        supabase.from('users').select('id, school_id, first_name, last_name, nickname, role, roles, email, photo_url, instrument, is_active, ausweis_nummer, teacher_qr_token, is_campus_active, is_groovelab_active, is_premium_user, contract_ends_at, teacher_id, lesson_duration, qr_token, is_pin_activated, ausfall_until, created_at, preferred_room_ids, planned_boards, student_billing_payment_method, activated_at, student_billing_cash_paid, is_trial, trial_ends_at, exempt_from_direct_billing').eq('school_id', schoolId),
        supabase.from('rooms').select('*').eq('school_id', schoolId),
        supabase.from('schedules').select('*').eq('school_id', schoolId),
        supabase.from('bands').select('*').eq('school_id', schoolId),
        supabase.from('students').select('*').eq('school_id', schoolId),
        supabase.from('stations').select('*, rooms!inner(school_id)').eq('rooms.school_id', schoolId)
      ]);

      if (schoolRes.error) throw schoolRes.error;
      if (usersRes.error) throw usersRes.error;
      if (roomsRes.error) throw roomsRes.error;
      if (schedulesRes.error) throw schedulesRes.error;
      if (bandsRes.error) throw bandsRes.error;
      if (studentsRes.error) throw studentsRes.error;
      if (stationsRes.error) throw stationsRes.error;

      const bandIds = (bandsRes.data || []).map((b: any) => b.id);
      const studentIds = (studentsRes.data || []).map((s: any) => s.id);

      const [
        bandMembersRes,
        studentFirstNamesRes,
        studentLastNamesRes,
        emailPrefixesRes,
        emailSuffixesRes,
        activationDaysRes
      ] = await Promise.all([
        bandIds.length > 0
          ? supabase.from('band_members').select('*').in('band_id', bandIds)
          : Promise.resolve({ data: [], error: null }),
        studentIds.length > 0
          ? supabase.from('student_first_names').select('*').in('student_id', studentIds)
          : Promise.resolve({ data: [], error: null }),
        studentIds.length > 0
          ? supabase.from('student_last_names').select('*').in('student_id', studentIds)
          : Promise.resolve({ data: [], error: null }),
        studentIds.length > 0
          ? supabase.from('email_prefixes').select('*').in('student_id', studentIds)
          : Promise.resolve({ data: [], error: null }),
        studentIds.length > 0
          ? supabase.from('email_suffixes').select('*').in('student_id', studentIds)
          : Promise.resolve({ data: [], error: null }),
        studentIds.length > 0
          ? supabase.from('activation_days').select('*').in('student_id', studentIds)
          : Promise.resolve({ data: [], error: null })
      ]);

      if (bandMembersRes.error) throw bandMembersRes.error;
      if (studentFirstNamesRes.error) throw studentFirstNamesRes.error;
      if (studentLastNamesRes.error) throw studentLastNamesRes.error;
      if (emailPrefixesRes.error) throw emailPrefixesRes.error;
      if (emailSuffixesRes.error) throw emailSuffixesRes.error;
      if (activationDaysRes.error) throw activationDaysRes.error;

      const backupData = {
        schoolId,
        version: '1.0',
        exportDate: new Date().toISOString(),
        school: schoolRes.data,
        users: usersRes.data || [],
        rooms: roomsRes.data || [],
        stations: (stationsRes.data || []).map(({ rooms, ...s }: any) => s),
        schedules: schedulesRes.data || [],
        bands: bandsRes.data || [],
        bandMembers: bandMembersRes.data || [],
        students: studentsRes.data || [],
        studentFirstNames: studentFirstNamesRes.data || [],
        studentLastNames: studentLastNamesRes.data || [],
        emailPrefixes: emailPrefixesRes.data || [],
        emailSuffixes: emailSuffixesRes.data || [],
        activationDays: activationDaysRes.data || []
      };

      const jsonBlob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const downloadUrl = URL.createObjectURL(jsonBlob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", downloadUrl);
      downloadAnchor.setAttribute("download", `Backup_Campus_Groovelab_${schoolName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(downloadUrl);

      const nowStr = new Date().toISOString();
      localStorage.setItem(`groovelab_last_backup_${schoolId}`, nowStr);
      setLastBackupDate(nowStr);
    } catch (err) {
      console.error('[Backup] Export failed:', err);
      alert('Backup-Export fehlgeschlagen: ' + (err as any).message);
    } finally {
      setIsExporting(false);
    }
  };

  // 16. Disaster Recovery: JSON Backup Restore with Rollback Guard
  const handleRestoreBackup = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backupData = JSON.parse(e.target?.result as string);

        if (backupData.schoolId !== schoolId) {
          alert('Fehler: Dieses Backup gehört zu einer anderen Musikschule und kann hier nicht eingespielt werden.');
          return;
        }
        if (!backupData.users || !backupData.rooms || !backupData.schedules || !backupData.students) {
          alert('Fehler: Ungültiges Backup-Format.');
          return;
        }

        const confirmWord = prompt('WARNUNG: Dies wird ALLE aktuellen Daten dieser Musikschule (Stundenpläne, Räume, Benutzer, Schülerkartei) unwiderruflich überschreiben! Tippen Sie zur Bestätigung das Wort "RESTORE" ein:');
        if (confirmWord !== 'RESTORE') {
          alert('Wiederherstellung abgebrochen.');
          return;
        }

        setIsRestoring(true);

        try {
          const [
            uRes, rRes, sRes, bRes, stRes, stationsRes
          ] = await Promise.all([
            supabase.from('users').select('id, school_id, first_name, last_name, nickname, role, roles, email, photo_url, instrument, is_active, ausweis_nummer, teacher_qr_token, is_campus_active, is_groovelab_active, is_premium_user, contract_ends_at, teacher_id, lesson_duration, qr_token, is_pin_activated, ausfall_until, created_at, preferred_room_ids, planned_boards, student_billing_payment_method, activated_at, student_billing_cash_paid, is_trial, trial_ends_at, exempt_from_direct_billing').eq('school_id', schoolId),
            supabase.from('rooms').select('*').eq('school_id', schoolId),
            supabase.from('schedules').select('*').eq('school_id', schoolId),
            supabase.from('bands').select('*').eq('school_id', schoolId),
            supabase.from('students').select('*').eq('school_id', schoolId),
            supabase.from('stations').select('*, rooms!inner(school_id)').eq('rooms.school_id', schoolId)
          ]);
          const currentData = {
            schoolId,
            exportDate: new Date().toISOString(),
            users: uRes.data || [],
            rooms: rRes.data || [],
            stations: (stationsRes.data || []).map(({ rooms, ...s }: any) => s),
            schedules: sRes.data || [],
            bands: bRes.data || [],
            students: stRes.data || []
          };
          localStorage.setItem(`groovelab_rollback_backup_${schoolId}`, JSON.stringify(currentData));
        } catch (rollBackErr) {
          console.warn('Rollback backup failed, proceeding anyway:', rollBackErr);
        }

        // Delete all current stations explicitly first, then delete rooms
        await supabase.from('stations').delete().in('room_id', (await supabase.from('rooms').select('id').eq('school_id', schoolId)).data?.map((r: any) => r.id) || []);
        await supabase.from('band_members').delete().in('band_id', (await supabase.from('bands').select('id').eq('school_id', schoolId)).data?.map((b: any) => b.id) || []);
        await supabase.from('bands').delete().eq('school_id', schoolId);
        await supabase.from('schedules').delete().eq('school_id', schoolId);
        const restoreStudentIds = (await supabase.from('students').select('id').eq('school_id', schoolId)).data?.map((s: any) => s.id) || [];
        await supabase.from('student_first_names').delete().in('student_id', restoreStudentIds);
        await supabase.from('student_last_names').delete().in('student_id', restoreStudentIds);
        await supabase.from('email_prefixes').delete().in('student_id', restoreStudentIds);
        await supabase.from('email_suffixes').delete().in('student_id', restoreStudentIds);
        await supabase.from('activation_days').delete().in('student_id', restoreStudentIds);
        await supabase.from('students').delete().eq('school_id', schoolId);
        await supabase.from('rooms').delete().eq('school_id', schoolId);
        await supabase.from('users').delete().eq('school_id', schoolId).neq('id', userId);

        if (backupData.school) {
          const { id, created_at, ...schoolSettings } = backupData.school;
          await supabase.from('schools').update(schoolSettings).eq('id', schoolId);
        }

        if (backupData.users.length > 0) {
          const usersToInsert = backupData.users.filter((u: any) => u.id !== userId);
          if (usersToInsert.length > 0) {
            const { error } = await supabase.from('users').insert(usersToInsert);
            if (error) throw error;
          }
          // Update the current logged-in user with their backup data (excluding primary key/email conflicts)
          const currentUserBackup = backupData.users.find((u: any) => u.id === userId);
          if (currentUserBackup) {
            const { id, created_at, email, ...updatableFields } = currentUserBackup;
            await supabase.from('users').update(updatableFields).eq('id', userId);
          }
        }
        if (backupData.rooms.length > 0) {
          const { error } = await supabase.from('rooms').insert(backupData.rooms);
          if (error) throw error;
        }
        if (backupData.stations && backupData.stations.length > 0) {
          const { error } = await supabase.from('stations').insert(backupData.stations);
          if (error) throw error;
        }
        if (backupData.students.length > 0) {
          const { error } = await supabase.from('students').insert(backupData.students);
          if (error) throw error;
        }
        if (backupData.studentFirstNames && backupData.studentFirstNames.length > 0) {
          const { error } = await supabase.from('student_first_names').insert(backupData.studentFirstNames);
          if (error) throw error;
        }
        if (backupData.studentLastNames && backupData.studentLastNames.length > 0) {
          const { error } = await supabase.from('student_last_names').insert(backupData.studentLastNames);
          if (error) throw error;
        }
        if (backupData.studentNames && backupData.studentNames.length > 0) {
          const firstNamesToInsert = backupData.studentNames.map((sn: any) => ({
            student_id: sn.student_id,
            first_name: sn.first_name
          }));
          const lastNamesToInsert = backupData.studentNames.map((sn: any) => ({
            student_id: sn.student_id,
            last_name: sn.last_name
          }));
          const { error: fErr } = await supabase.from('student_first_names').insert(firstNamesToInsert);
          if (fErr) throw fErr;
          const { error: lErr } = await supabase.from('student_last_names').insert(lastNamesToInsert);
          if (lErr) throw lErr;
        }
        if (backupData.emailPrefixes && backupData.emailPrefixes.length > 0) {
          const { error } = await supabase.from('email_prefixes').insert(backupData.emailPrefixes);
          if (error) throw error;
        }
        if (backupData.emailSuffixes && backupData.emailSuffixes.length > 0) {
          const { error } = await supabase.from('email_suffixes').insert(backupData.emailSuffixes);
          if (error) throw error;
        }
        if (backupData.activationDays && backupData.activationDays.length > 0) {
          const { error } = await supabase.from('activation_days').insert(backupData.activationDays);
          if (error) throw error;
        }
        if (backupData.schedules.length > 0) {
          const { error } = await supabase.from('schedules').insert(backupData.schedules);
          if (error) throw error;
        }
        if (backupData.bands && backupData.bands.length > 0) {
          const { error } = await supabase.from('bands').insert(backupData.bands);
          if (error) throw error;
        }
        if (backupData.bandMembers && backupData.bandMembers.length > 0) {
          const { error } = await supabase.from('band_members').insert(backupData.bandMembers);
          if (error) throw error;
        }

        alert('Daten erfolgreich wiederhergestellt! Das Dashboard wird neu geladen.');
        window.location.reload();
      } catch (err) {
        console.error('[Backup] Restore failed:', err);
        alert('Wiederherstellung fehlgeschlagen: ' + (err as any).message);
      } finally {
        setIsRestoring(false);
      }
    };
    reader.readAsText(file);
  };

  return {
    // 1. School Master Data
    schoolName,
    setSchoolName,
    schoolSubdomain,
    setSchoolSubdomain,
    schoolZipCode,
    setSchoolZipCode,
    schoolCity,
    setSchoolCity,
    schoolStreet,
    setSchoolStreet,
    schoolHouseNumber,
    setSchoolHouseNumber,
    schoolPhoneNumber,
    setSchoolPhoneNumber,
    schoolEmail,
    setSchoolEmail,
    absenceEmail,
    setAbsenceEmail,
    logoUrl,
    setLogoUrl,
    openingHours,
    setOpeningHours,

    // 2. Operational & Kiosk Settings
    kioskPinLength,
    setKioskPinLength,
    bypassPin,
    setBypassPin,
    logRetention,
    setLogRetention,
    syncInterval,
    setSyncInterval,
    calendarUrls,
    setCalendarUrls,
    newCalendarUrlInput,
    setNewCalendarUrlInput,

    // 3. School Year & Expiry
    schoolYearStartMonth,
    setSchoolYearStartMonth,
    schoolYearStartDay,
    setSchoolYearStartDay,
    autoDeleteExpiredUsers,
    setAutoDeleteExpiredUsers,

    // 4. Dirty & Save State
    initialSettings,
    setInitialSettings,
    isSavingSettings,
    isSettingsDirty,
    initSettingsFromSchool,
    handleSaveAllSettings,
    handleToggleSetting,
    handleSaveSettingValue,
    handleToggleAutoClean,
    handleUpdateSchoolYear,
    handleAddCalendarUrl,
    handleRemoveCalendarUrl,

    // 5. Modals & Navigation
    activeSecretarySettingsModal,
    setActiveSecretarySettingsModal,
    settingsTab,
    setSettingsTab,
    showResetModal,
    setShowResetModal,
    resetConfirmText,
    setResetConfirmText,
    isResetting,

    // 6. Clipboard states
    copiedSettingsPin,
    setCopiedSettingsPin,
    copiedSettingsLink,
    setCopiedSettingsLink,
    copiedKioskLink,
    setCopiedKioskLink,
    copiedSchoolLink,
    setCopiedSchoolLink,

    // 7. Biometrics
    biometricsStatus,
    setBiometricsStatus,
    biometricsMessage,
    setBiometricsMessage,
    isCurrentDevicePasskeyActive,
    handleEnrollBiometrics,
    handleTestBiometrics,
    handleRemoveBiometrics,

    // 8. Disaster Recovery
    isExporting,
    isRestoring,
    lastBackupDate,
    setLastBackupDate,
    daysSinceLastBackup,
    showBackupAlert,
    handleExportBackup,
    handleRestoreBackup,
    handleResetSchool
  };
}
