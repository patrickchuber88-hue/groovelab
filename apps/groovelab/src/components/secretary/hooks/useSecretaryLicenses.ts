import { useState, useCallback } from 'react';
import { calculateSchoolYearDirectBilling } from '../../../utils/epcGiroCode';

export interface UseSecretaryLicensesProps {
  schoolId: string;
  schoolNumericId: string | number;
  schoolName?: string;
  currentSchoolProfile: any;
  setCurrentSchoolProfile?: (profile: any) => void;
  currentUserProfile?: any;
  supabase: any;
  fetchDashboardData: () => void | Promise<void>;
  masterPricing: any;
  effectiveSchoolRates: any;
  subjects: any[];
  openingHours?: any;
  schoolYearStartMonth?: string | number;
  schoolYearStartDay?: string | number;
}

export interface B2BPricingParams {
  isBillingBooked: boolean;
  hasCampusSub: boolean;
  campusActivatedThisMonth: boolean;
  hasGroovelabSub: boolean;
  groovelabActivatedThisMonth: boolean;
  effectiveSchoolRates: any;
  students: any[];
  campusTeachers: any[];
  bypassTeachers: any[];
  coaches: any[];
  allTeachers: any[];
  billingPayer: string;
  studentBillingOption: string;
  selectedStorageAddonGb: number;
  selectedStorageAddonFee: number;
  currentSchoolProfile: any;
  subscriptionBypass: boolean;
  extraBillingOption: string;
  bookedExtraUsers: number;
}

export function computeB2BPricingMetrics({
  isBillingBooked,
  hasCampusSub,
  campusActivatedThisMonth,
  hasGroovelabSub,
  groovelabActivatedThisMonth,
  effectiveSchoolRates,
  students,
  campusTeachers,
  bypassTeachers,
  coaches,
  allTeachers,
  billingPayer,
  studentBillingOption,
  selectedStorageAddonGb,
  selectedStorageAddonFee,
  currentSchoolProfile,
  subscriptionBypass,
  extraBillingOption,
  bookedExtraUsers
}: B2BPricingParams) {
  const billedCampus_global = isBillingBooked ? (hasCampusSub || campusActivatedThisMonth) : hasCampusSub;
  const billedGroovelab_global = isBillingBooked ? (hasGroovelabSub || groovelabActivatedThisMonth) : hasGroovelabSub;
  const activeModulesCount_global = (billedCampus_global ? 1 : 0) + (billedGroovelab_global ? 1 : 0);
  const moduleCost_global = (billedCampus_global && billedGroovelab_global)
    ? effectiveSchoolRates.priceKombi
    : ((billedCampus_global ? effectiveSchoolRates.priceCampus : 0) + (billedGroovelab_global ? effectiveSchoolRates.priceGroovelab : 0));
  
  const activeStudentsCount_global = (students || []).filter((s: any) => s.isCampusActive || s.is_campus_active).length;
  const activeGroovelabStudentsCount_global = (students || []).filter((s: any) => s.isGroovelabActive || s.is_groovelab_active).length;
  const maxActiveStudentsCount_global = Math.max(activeStudentsCount_global, activeGroovelabStudentsCount_global);
  const passiveStudentsCount_global = Math.max(0, (students || []).length - maxActiveStudentsCount_global);

  const allUniqueTeacherProfiles = [...(campusTeachers || []), ...(bypassTeachers || []), ...(coaches || []), ...(allTeachers || [])].reduce((acc: any[], t: any) => {
    if (t && t.id && !acc.some(existing => existing.id === t.id)) {
      acc.push(t);
    }
    return acc;
  }, []).sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

  // Anti-Abuse Rule: Pure Management is unlimited 100% free.
  // Double-Roles (Management + Teacher): Max 2 profiles are free; 3rd and subsequent double-roles are billed (0,49 € / Mo.).
  let freeDoubleRoleCount = 0;
  const billableTeachersCount = allUniqueTeacherProfiles.filter((t: any) => {
    const isManagement = t.role === 'admin' || t.role === 'secretary' || (Array.isArray(t.roles) && (t.roles.includes('admin') || t.roles.includes('secretary')));
    const isTeacher = t.role === 'teacher' || (Array.isArray(t.roles) && t.roles.includes('teacher')) || (t.studentCount && t.studentCount > 0);
    
    if (isManagement && isTeacher) {
      if (freeDoubleRoleCount < 2) {
        freeDoubleRoleCount++;
        return false; // Free double-role exemption
      }
      return true; // Exceeded 2 free double-roles -> Billed at 0,49 € / Mo.
    }
    if (isManagement && !isTeacher) {
      return false; // Pure Management -> Always 100% Free
    }
    return true; // Pure Teacher -> Billed
  }).length;

  const isSammelzahler = billingPayer === 'school' || studentBillingOption === 'option2' || studentBillingOption === 'option1';
  const campusActivationFeeTotal_global = isSammelzahler ? activeStudentsCount_global * effectiveSchoolRates.priceStudent : 0;
  const groovelabActivationFeeTotal_global = activeGroovelabStudentsCount_global * effectiveSchoolRates.priceStudent;
  const passiveStudentFeeTotal_global = passiveStudentsCount_global * 0.09;
  const teacherServiceFeeTotal_global = billableTeachersCount * effectiveSchoolRates.priceTeacher;
  const storageAddonFee_global = selectedStorageAddonGb > 0 ? (selectedStorageAddonFee || Number(currentSchoolProfile?.storage_addon_monthly_fee || 0)) : 0;

  const baseB2B_global = subscriptionBypass
    ? 0
    : (moduleCost_global + teacherServiceFeeTotal_global + passiveStudentFeeTotal_global + groovelabActivationFeeTotal_global + campusActivationFeeTotal_global + storageAddonFee_global);
  const studentLevyMonthly_global = campusActivationFeeTotal_global;
  const extraLevyMonthly_global = extraBillingOption === 'option2' ? bookedExtraUsers * effectiveSchoolRates.priceTeacher : 0;
  const studentSharePreview_global = 0;
  const schoolShareBookedExtra_global = 0;
  const currentTotalB2B_global = baseB2B_global;
  const mixedTotal_global = currentTotalB2B_global;

  return {
    billedCampus_global,
    billedGroovelab_global,
    activeModulesCount_global,
    moduleCost_global,
    activeStudentsCount_global,
    activeGroovelabStudentsCount_global,
    maxActiveStudentsCount_global,
    passiveStudentsCount_global,
    billableTeachersCount,
    isSammelzahler,
    campusActivationFeeTotal_global,
    groovelabActivationFeeTotal_global,
    passiveStudentFeeTotal_global,
    teacherServiceFeeTotal_global,
    storageAddonFee_global,
    baseB2B_global,
    studentLevyMonthly_global,
    extraLevyMonthly_global,
    studentSharePreview_global,
    schoolShareBookedExtra_global,
    currentTotalB2B_global,
    mixedTotal_global
  };
}

export const useSecretaryLicenses = ({
  schoolId,
  schoolNumericId,
  schoolName,
  currentSchoolProfile,
  setCurrentSchoolProfile,
  currentUserProfile,
  supabase,
  fetchDashboardData,
  masterPricing,
  effectiveSchoolRates,
  subjects,
  openingHours,
  schoolYearStartMonth = 9,
  schoolYearStartDay = 1
}: UseSecretaryLicensesProps) => {
  // ─── SUBSCRIPTION & MODULE STATES ───
  const [hasCampusSub, setHasCampusSub] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(`hasCampusSub_${schoolId}`);
    if (stored !== null) return stored === 'true';
    const booked = localStorage.getItem(`isBillingBooked_${schoolId}`) === 'true';
    return booked ? true : false;
  });

  const [hasGroovelabSub, setHasGroovelabSub] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(`hasGroovelabSub_${schoolId}`);
    if (stored !== null) return stored === 'true';
    const booked = localStorage.getItem(`isBillingBooked_${schoolId}`) === 'true';
    return booked ? true : false;
  });

  const [campusActivatedThisMonth, setCampusActivatedThisMonth] = useState<boolean>(false);
  const [groovelabActivatedThisMonth, setGroovelabActivatedThisMonth] = useState<boolean>(false);
  const [studentBillingOption, setStudentBillingOption] = useState<string>('option2');

  const [isBillingBooked, setIsBillingBooked] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem(`isBillingBooked_${schoolId}`) === 'true';
  });

  const [bookedExtraUsers, setBookedExtraUsers] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const val = localStorage.getItem(`bookedExtraUsers_${schoolId}`);
    let baseVal = val ? parseInt(val, 10) : 0;
    const hasUnbooked = localStorage.getItem(`unbooked_52_temp_${schoolId}`);
    if (!hasUnbooked) {
      baseVal = Math.max(0, baseVal - 52);
      localStorage.setItem(`bookedExtraUsers_${schoolId}`, baseVal.toString());
      localStorage.setItem(`unbooked_52_temp_${schoolId}`, 'true');
    }
    return baseVal;
  });

  const [extraUsersSliderVal, setExtraUsersSliderVal] = useState<number>(0);
  const [extraBillingOption, setExtraBillingOption] = useState<string>('option1');

  const [nextBillingOption, setNextBillingOption] = useState<string>(() => {
    return typeof window !== 'undefined' ? (localStorage.getItem(`nextBillingOption_${schoolId}`) || '') : '';
  });

  const [nextBillingOptionEffectiveAt, setNextBillingOptionEffectiveAt] = useState<string>(() => {
    return typeof window !== 'undefined' ? (localStorage.getItem(`nextBillingOptionEffectiveAt_${schoolId}`) || '') : '';
  });

  const [showChangeTariffModal, setShowChangeTariffModal] = useState<boolean>(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  const [checkoutStep, setCheckoutStep] = useState<number>(1);
  const [billingPayer, setBillingPayer] = useState<'school' | 'student'>('school');
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [customUmlageAmount, setCustomUmlageAmount] = useState<number>(0.49);
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(false);
  const [couponCode, setCouponCode] = useState<string>('');
  const [isCouponApplied, setIsCouponApplied] = useState<boolean>(false);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [showCouponInput, setShowCouponInput] = useState<boolean>(false);

  // Custom Billing Addresses
  const [hasCustomBillingAddress, setHasCustomBillingAddress] = useState<boolean>(false);
  const [customBillingName, setCustomBillingName] = useState<string>('');
  const [customBillingStreet, setCustomBillingStreet] = useState<string>('');
  const [customBillingZip, setCustomBillingZip] = useState<string>('');
  const [customBillingCity, setCustomBillingCity] = useState<string>('');
  const [customBillingEmail, setCustomBillingEmail] = useState<string>('');
  const [customBillingLeitwegId, setCustomBillingLeitwegId] = useState<string>(() => currentSchoolProfile?.leitweg_id || '');

  const [hasCustomActivationBillingAddress, setHasCustomActivationBillingAddress] = useState<boolean>(false);
  const [customActivationBillingName, setCustomActivationBillingName] = useState<string>('');
  const [customActivationBillingStreet, setCustomActivationBillingStreet] = useState<string>('');
  const [customActivationBillingZip, setCustomActivationBillingZip] = useState<string>('');
  const [customActivationBillingCity, setCustomActivationBillingCity] = useState<string>('');
  const [customActivationBillingEmail, setCustomActivationBillingEmail] = useState<string>('');

  // Storage Addon States
  const [selectedStorageAddonGb, setSelectedStorageAddonGb] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    return Number(localStorage.getItem(`groovelab_storage_addon_gb_${schoolId}`) || localStorage.getItem('groovelab_storage_addon_gb') || 0);
  });

  const [selectedStorageAddonFee, setSelectedStorageAddonFee] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const gb = Number(localStorage.getItem(`groovelab_storage_addon_gb_${schoolId}`) || localStorage.getItem('groovelab_storage_addon_gb') || 0);
    return gb === 5 ? 1.49 : gb === 10 ? 1.99 : gb === 20 ? 3.99 : gb === 25 ? 3.99 : gb === 50 ? 6.99 : gb === 100 ? 11.99 : gb === 250 ? 24.99 : 0;
  });

  const [showStorageManagerModal, setShowStorageManagerModal] = useState<boolean>(false);
  const [isSubmittingStorage, setIsSubmittingStorage] = useState<boolean>(false);
  const [storageBookingSuccessModal, setStorageBookingSuccessModal] = useState<{
    isOpen: boolean;
    receiptNumber: string;
    newGb: number;
    newFee: number;
    isDowngrade: boolean;
    effectiveDate?: string;
  } | null>(null);

  const [showSwitchBillingModelModal, setShowSwitchBillingModelModal] = useState<boolean>(false);
  const [selectedSwitchTargetPayer, setSelectedSwitchTargetPayer] = useState<'school' | 'student'>('student');
  const [isSwitchingPayer, setIsSwitchingPayer] = useState<boolean>(false);

  const [showStorageTerminationModal, setShowStorageTerminationModal] = useState<boolean>(false);
  const [storageTerminationDays, setStorageTerminationDays] = useState<number>(30);
  const [agreedToSepa, setAgreedToSepa] = useState<boolean>(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showConfirmExtra, setShowConfirmExtra] = useState<boolean>(false);

  // School Trial & Subscription Status
  const [isSchoolTrial, setIsSchoolTrial] = useState<boolean>(false);
  const [schoolTrialEndsAt, setSchoolTrialEndsAt] = useState<string | null>(null);
  const [schoolStatus, setSchoolStatus] = useState<string>('active');
  const [subscriptionBypass, setSubscriptionBypass] = useState<boolean>(false);

  const [contractStartDate, setContractStartDate] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? (localStorage.getItem(`contractStartDate_${schoolId}`) || localStorage.getItem(`simulatedContractStartDate_${schoolId}`)) : null;
  });

  // Cancellation States (§ 312k BGB)
  const [isCancelled, setIsCancelled] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem(`isCancelled_${schoolId}`) === 'true';
  });
  const [schoolContractEndsAt, setSchoolContractEndsAt] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>('');
  const [lastCancellationId, setLastCancellationId] = useState<string>('');
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);

  // Module Upgrade Modal States
  const [showModuleUpgradeModal, setShowModuleUpgradeModal] = useState<boolean>(false);
  const [upgradeTargetModule, setUpgradeTargetModule] = useState<'campus' | 'groovelab'>('campus');
  const [upgradeProcessing, setUpgradeProcessing] = useState<boolean>(false);

  // User Quotas
  const [userQuota, setUserQuota] = useState<number>(150);
  const [activeUserQuota, setActiveUserQuota] = useState<number>(150);
  const [pendingUserQuota, setPendingUserQuota] = useState<number | null>(null);

  // Tariff Bookings
  const [tariffBookings, setTariffBookings] = useState<any[]>([]);
  const [loadingTariffBookings, setLoadingTariffBookings] = useState<boolean>(false);

  // Trial Logs (Student activation trials)
  const [trialLogs, setTrialLogs] = useState<any[]>([]);
  const [trialLogsLoading, setTrialLogsLoading] = useState<boolean>(false);

  // ─── TARIFF BOOKINGS FETCH & BASELINE SYNTHESIZER ───
  const fetchTariffBookings = useCallback(async (overrideSchoolData?: any) => {
    if (!schoolId) return;
    setLoadingTariffBookings(true);
    try {
      const { data, error } = await supabase
        .from('school_tariff_bookings')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setTariffBookings(data);
      } else {
        // Authoritative Baseline Guarantee: If the school has an active contract (is_billing_booked = true),
        // but no booking row exists yet in school_tariff_bookings, synthesize the verified initial contract receipt.
        const schoolObj = overrideSchoolData || currentSchoolProfile;
        const booked = schoolObj?.is_billing_booked ?? isBillingBooked;
        if (booked) {
          let sCampus = schoolObj?.has_campus_subscription ?? hasCampusSub;
          let sGroove = schoolObj?.has_groovelab_subscription ?? hasGroovelabSub;
          if (!sCampus && !sGroove) {
            sCampus = true;
            sGroove = true;
          }
          const sBillingOpt = schoolObj?.student_billing_option || studentBillingOption || 'option1';
          const sStorageGb = Number(schoolObj?.storage_addon_gb ?? selectedStorageAddonGb ?? 0);
          const sStorageFee = Number(schoolObj?.storage_addon_monthly_fee ?? selectedStorageAddonFee ?? 0);
          const sStorageStatus = schoolObj?.storage_addon_status || (sStorageGb > 0 ? 'active' : 'none');
          const sDowngradeGb = schoolObj?.storage_pending_downgrade_gb ?? null;
          const sDowngradeDate = schoolObj?.storage_pending_effective_date ?? null;
          const sContractStart = schoolObj?.contract_start_date || '2026-09-01';

          const baseRate = (sCampus && sGroove) ? 19.90 : sCampus ? 14.90 : sGroove ? 9.90 : 19.90;
          const totalNet = baseRate + sStorageFee;
          const schoolHex = (schoolId || '000000').replace(/-/g, '').slice(0, 6).toUpperCase();

          const initialBaselineReceipt = {
            id: `baseline-${schoolId}`,
            school_id: schoolId,
            receipt_number: `TB-${schoolHex}-260901-INIT`,
            booking_type: 'SUBSCRIPTION_BOOKING',
            has_campus_subscription: sCampus,
            has_groovelab_subscription: sGroove,
            student_billing_option: sBillingOpt,
            storage_addon_gb: sStorageGb,
            storage_addon_monthly_fee: sStorageFee,
            storage_addon_status: sStorageStatus,
            storage_pending_downgrade_gb: sDowngradeGb,
            storage_pending_effective_date: sDowngradeDate,
            total_monthly_rate_net: totalNet,
            currency: 'EUR',
            effective_date: sContractStart,
            notes: 'Initialer Schuljahres-Vertragsabschluss 2026/2027 (Campus-Groovelab)',
            booked_by_name: schoolObj?.avv_signee_name || 'Schulleitung',
            created_at: sContractStart ? `${sContractStart}T09:00:00Z` : new Date().toISOString()
          };

          setTariffBookings([initialBaselineReceipt]);

          // Attempt async persistence
          try {
            await supabase.from('school_tariff_bookings').insert([initialBaselineReceipt]);
          } catch (e) {}
        } else {
          setTariffBookings([]);
        }
      }
    } catch (err) {
      console.error('Error fetching tariff bookings:', err);
    } finally {
      setLoadingTariffBookings(false);
    }
  }, [schoolId, currentSchoolProfile, isBillingBooked, hasCampusSub, hasGroovelabSub, studentBillingOption, selectedStorageAddonGb, selectedStorageAddonFee, supabase]);

  // ─── SUBSCRIPTION TOGGLES ───
  const handleToggleCampusSub = async (newValue: boolean) => {
    if (isBillingBooked && !newValue) {
      alert("Dieses Modul ist Teil deiner aktiven Buchung für das Schuljahr 2026/2027 und kann nicht deaktiviert werden.");
      return;
    }
    setHasCampusSub(newValue);
    if (newValue) {
      setCampusActivatedThisMonth(true);
    }
    if (isBillingBooked) {
      try {
        const updateData: any = { has_campus_subscription: newValue };
        if (newValue) updateData.campus_activated_this_month = true;
        await supabase
          .from('schools')
          .update(updateData)
          .eq('id', schoolId);
      } catch (err: any) {
        console.warn("Could not update campus sub:", err);
      }
    }
  };

  const handleToggleGroovelabSub = async (newValue: boolean) => {
    if (isBillingBooked && !newValue) {
      alert("Dieses Modul ist Teil deiner aktiven Buchung für das Schuljahr 2026/2027 und kann nicht deaktiviert werden.");
      return;
    }
    setHasGroovelabSub(newValue);
    if (newValue) {
      setGroovelabActivatedThisMonth(true);
    }
    if (isBillingBooked) {
      try {
        const updateData: any = { has_groovelab_subscription: newValue };
        if (newValue) updateData.groovelab_activated_this_month = true;
        await supabase
          .from('schools')
          .update(updateData)
          .eq('id', schoolId);
      } catch (err: any) {
        console.warn("Could not update groovelab sub:", err);
      }
    }
    if (newValue) {
      // Auto-seed GrooveLab subject if it doesn't exist yet
      const grooveLabExists = (subjects || []).some(s => s.name.toLowerCase() === 'groovelab');
      if (!grooveLabExists) {
        const { error: insertErr } = await supabase
          .from('subjects')
          .insert({
            school_id: schoolId,
            name: 'GrooveLab',
            category: 'Allgemein',
            description: 'Automatisch angelegtes Fach für GrooveLab-Unterricht'
          });
        if (insertErr) {
          console.error('Error seeding GrooveLab subject:', insertErr);
        }
      }
    }
  };

  const handleUpdateStudentBillingOption = async (option: string) => {
    try {
      setStudentBillingOption(option);
      const { error } = await supabase
        .from('schools')
        .update({ student_billing_option: option })
        .eq('id', schoolId);
      if (error) throw error;
    } catch (err: any) {
      console.error('Error updating student billing option:', err);
    }
  };

  const handleUpdateExtraBillingOption = async (option: string) => {
    try {
      setExtraBillingOption(option);
      const { error } = await supabase
        .from('schools')
        .update({ extra_billing_option: option })
        .eq('id', schoolId);
      if (error) throw error;
    } catch (err: any) {
      console.error('Error updating extra billing option:', err);
    }
  };

  const handleSaveQuota = async () => {
    try {
      const { error } = await supabase
        .from('schools')
        .update({
          pending_user_quota: userQuota,
          quota_updated_at: new Date().toISOString()
        })
        .eq('id', schoolId);

      if (error) throw error;
      setPendingUserQuota(userQuota);
      alert(`Erfolgreich! Dein gewünschtes Kontingent von ${userQuota} Usern wurde für den nächsten Monat vorgemerkt und kann bis zum Monatsende geändert werden.`);
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Speichern: ' + err.message);
    }
  };

  // ─── TRIAL LOGS & STUDENT TRIAL FREISCHALTUNG ───
  const fetchTrialLogs = async () => {
    setTrialLogsLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('school_id', schoolId)
        .eq('table_name', 'users')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const filtered = (data || []).filter((log: any) => {
        if (!log.new_data) return false;
        const isTrialStart = log.new_data.is_trial === true && (!log.old_data || log.old_data.is_trial !== true);
        const isPermanentActivation = log.old_data?.is_trial === true && log.new_data.is_trial === false && log.new_data.is_campus_active !== false;
        
        const isStudentTrialStart = isTrialStart && (!log.changed_by || log.changed_by === log.record_id);
        const isStaffActivation = isPermanentActivation && log.changed_by && log.changed_by !== log.record_id;
        
        return isStudentTrialStart || isStaffActivation;
      });
      
      setTrialLogs(filtered);
    } catch (err) {
      console.error('Error fetching trial logs:', err);
    } finally {
      setTrialLogsLoading(false);
    }
  };

  const getRemainingMonthsAndPrice = useCallback(() => {
    const now = new Date();
    const startMonth = Number(schoolYearStartMonth || 9);
    const startDay = Number(schoolYearStartDay || 1);
    const isChf = masterPricing.currency === 'CHF';
    const activeCurrency = isChf ? 'CHF' : 'EUR';
    const rate = studentBillingOption === 'student_full' 
      ? (effectiveSchoolRates.priceStudent || (isChf ? 1.00 : 0.49))
      : (isChf ? 0.80 : 0.40);
    
    const calc = calculateSchoolYearDirectBilling(now, activeCurrency, rate, startMonth, startDay);
    return { 
      monthsCount: calc.remainingPaidMonths, 
      pricePerMonth: calc.monthlyRate, 
      totalPrice: calc.totalAmount,
      periodDescription: calc.periodDescription,
      endMonthName: calc.paidEndMonthName
    };
  }, [schoolYearStartMonth, schoolYearStartDay, masterPricing.currency, studentBillingOption, effectiveSchoolRates.priceStudent]);

  const generateMailtoLink = (student: any) => {
    const { monthsCount, pricePerMonth, totalPrice, periodDescription } = getRemainingMonthsAndPrice();
    const employeeName = currentUserProfile ? `${currentUserProfile.first_name} ${currentUserProfile.last_name || ''}`.trim() : 'Ihre Musikschule';
    const isChf = masterPricing.currency === 'CHF';
    const defaultTemplate = `Liebe Eltern,\n\nihr Kind {student_name} hat die Campus-App der Musikschule aktiviert und nutzt aktuell die 30-tägige kostenlose Probezeit.\n\nUm den Zugang dauerhaft freizuschalten, antworten Sie bitte einfach kurz auf diese E-Mail.\n\nDie Kosten belaufen sich für das restliche Schuljahr auf {months_count} Monate zu je {price_per_month} ${isChf ? 'CHF' : 'EUR'}, insgesamt also {total_price} (Laufzeit: {period_description}, ohne automatische Verlängerung).\n\nHerzliche Grüße\n{employee_name}\n{school_name}`;
    
    let template = openingHours?.campus_settings?.mailto_template || defaultTemplate;
    
    const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim();
    template = template.replace(/{student_name}/g, studentName);
    template = template.replace(/{months_count}/g, monthsCount.toString());
    template = template.replace(/{price_per_month}/g, isChf ? pricePerMonth.toFixed(2) : pricePerMonth.toFixed(2).replace('.', ','));
    template = template.replace(/{total_price}/g, isChf ? `CHF ${totalPrice.toFixed(2)}` : `${totalPrice.toFixed(2).replace('.', ',')} €`);
    template = template.replace(/{period_description}/g, periodDescription || '');
    template = template.replace(/{employee_name}/g, employeeName);
    template = template.replace(/{school_name}/g, schoolName || 'Ihre Musikschule');
    
    const subject = `Campus-Freischaltung für ${studentName}`;
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(template)}`;
  };

  const handleConfirmStudentTrial = async (studentId: string) => {
    if (!window.confirm("Möchtest du diesen Schüler dauerhaft für den Campus freischalten (Probezeit beenden)?")) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_trial: false,
          trial_ends_at: null,
          is_campus_active: true
        })
        .eq('id', studentId);
      if (error) throw error;
      alert("Schüler wurde erfolgreich dauerhaft aktiviert!");
      fetchDashboardData();
    } catch (err: any) {
      alert("Fehler bei der Aktivierung: " + err.message);
    }
  };

  const handleDeactivateStudentTrial = async (studentId: string) => {
    if (!window.confirm("Möchtest du die Probezeit dieses Schülers sofort beenden und das Profil auf Basis umstellen?")) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_campus_active: false,
          is_trial: false,
          trial_ends_at: null
        })
        .eq('id', studentId);
      if (error) throw error;
      alert("Probezeit beendet. Schülerprofil ist nun im Basis-Status.");
      fetchDashboardData();
    } catch (err: any) {
      alert("Fehler beim Umstellen auf Basis: " + err.message);
    }
  };

  // ─── TRIAL EXPIRATION COMPUTATIONS ───
  const getTrialDaysRemaining = useCallback(() => {
    if (!isSchoolTrial || !schoolTrialEndsAt) return 0;
    const diff = new Date(schoolTrialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [isSchoolTrial, schoolTrialEndsAt]);

  const trialDaysRemaining = getTrialDaysRemaining();

  const isTrialExpired = !subscriptionBypass && (
    schoolStatus === 'expired' || 
    (isSchoolTrial && schoolTrialEndsAt && new Date(schoolTrialEndsAt).getTime() < Date.now())
  );

  // Dynamic School Year End Calculation (German/Austrian Standard: Sept 1 to Aug 31)
  const getSchoolYearEndInfo = useCallback((simDate?: string | Date | null, existingEndIso?: string | null) => {
    if (existingEndIso) {
      const d = new Date(existingEndIso);
      const day = d.getDate();
      const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
      const monthName = monthNames[d.getMonth()] || 'August';
      const year = d.getFullYear();
      return {
        endDate: d,
        endDateIso: existingEndIso,
        formattedDate: `${day}. ${monthName} ${year}`,
        schoolYearLabel: `${year - 1}/${year}`
      };
    }
    const now = simDate 
      ? (typeof simDate === 'string' && !simDate.includes('T') ? new Date(simDate + 'T14:00:00') : new Date(simDate)) 
      : new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const targetEndYear = currentMonth >= 8 ? currentYear + 1 : currentYear;
    const schoolYearStartYear = targetEndYear - 1;
    const endDate = new Date(Date.UTC(targetEndYear, 7, 31, 21, 59, 59, 999));
    return {
      endDate,
      endDateIso: endDate.toISOString(),
      formattedDate: `31. August ${targetEndYear}`,
      schoolYearLabel: `${schoolYearStartYear}/${targetEndYear}`
    };
  }, []);

  // ─── PDF RECEIPTS & DOCUMENTS ───
  const downloadCancellationReceiptPdf = async (cancellationInfo: {
    cancellationId?: string;
    cancelledAt?: string | Date;
    effectiveEndDateFormatted: string;
    schoolName?: string;
  }) => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF('p', 'mm', 'a4');
      const sName = cancellationInfo.schoolName || schoolName || currentSchoolProfile?.name || 'Musikschule';
      const cId = cancellationInfo.cancellationId || `KD-${schoolNumericId}-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`;

      // Header Brand
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 210, 36, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text('Campus-Groovelab', 16, 16);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Rechtssichere Kündigungsbestätigung gem. § 312k Abs. 4 BGB', 16, 23);
      doc.text(`Aktenzeichen: ${cId}`, 16, 29);

      // Status Badge
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(135, 10, 60, 14, 3, 3, 'F');
      doc.setTextColor(180, 83, 9);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('KÜNDIGUNG BESTÄTIGT', 138, 19);

      // Main Card Box
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.roundedRect(16, 44, 178, 100, 4, 4, 'S');

      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text('Kündigung des Cloud-Infrastruktur-Abonnements', 22, 54);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Vertragspartner: ${sName}`, 22, 63);
      doc.text(`Kundennummer / Schul-ID: #${schoolNumericId}`, 22, 70);

      const cAt = cancellationInfo.cancelledAt ? new Date(cancellationInfo.cancelledAt) : new Date();
      const cAtStr = cAt.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      doc.text(`Eingangszeitpunkt der Kündigung: ${cAtStr} Uhr`, 22, 77);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`Wirksamkeitsdatum der Beendigung: ${cancellationInfo.effectiveEndDateFormatted}, 23:59:59 Uhr`, 22, 88);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Status bis Vertragsende: Vollzugriff aktiv (keine Leistungseinschränkungen)', 22, 96);
      doc.text('Abrechnung: Es erfolgen nach dem Wirksamkeitsdatum keine weiteren Abbuchungen.', 22, 103);
      doc.text('Aufbewahrungsfristen: Rechnungsbelege bleiben 10 Jahre gem. § 147 AO abrufbar.', 22, 110);
      doc.text('Reaktivierung: Der Vertrag kann vor dem Wirksamkeitsdatum jederzeit reaktiviert werden.', 22, 117);

      // Legal compliance footer
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Dieses Dokument wurde elektronisch erstellt und ist gem. § 312k Abs. 4 BGB i.V.m. § 126b BGB rechtsverbindlich.', 16, 156);
      doc.text('Campus-Groovelab Cloud Services • Hosting & School Management Infrastructure', 16, 161);

      doc.save(`Kuendigungsbestaetigung_Campus_Groovelab_${sName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (e) {
      console.error("Error generating cancellation PDF:", e);
      alert("Kündigungsbeleg konnte nicht als PDF erstellt werden.");
    }
  };

  const downloadUpgradeConfirmationPdf = async (upgradeInfo: {
    upgradeId: string;
    targetModule: 'campus' | 'groovelab';
    schoolName?: string;
    effectiveEndDateFormatted: string;
  }) => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF('p', 'mm', 'a4');
      const sName = upgradeInfo.schoolName || schoolName || currentSchoolProfile?.name || 'Musikschule';
      const modName = upgradeInfo.targetModule === 'campus' ? 'Campus Modul' : 'GrooveLab Modul';

      // Header Brand
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 210, 36, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text('Campus-Groovelab', 16, 16);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Vertragsänderungsbestätigung gem. § 311 Abs. 1 i.V.m. § 312i BGB', 16, 23);
      doc.text(`Aktenzeichen: ${upgradeInfo.upgradeId}`, 16, 29);

      // Status Badge
      doc.setFillColor(220, 252, 231);
      doc.roundedRect(130, 10, 65, 14, 3, 3, 'F');
      doc.setTextColor(22, 101, 52);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('UPGRADE BESTÄTIGT', 133, 19);

      // Main Card Box
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.roundedRect(16, 44, 178, 105, 4, 4, 'S');

      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(`Modul-Upgrade: Hinzubuchung von ${modName} (Kombi-Vorteil)`, 22, 54);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Vertragspartner: ${sName}`, 22, 63);
      doc.text(`Kundennummer / Schul-ID: #${schoolNumericId}`, 22, 70);

      const nowStr = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      doc.text(`Abschlusszeitpunkt: ${nowStr} Uhr`, 22, 77);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Neuer Infrastruktur-Hosting-Tarif: 19,90 € / Mo. (Kombi-Paket Campus + GrooveLab)', 22, 88);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Kombi-Vorteilsrabatt: -4,90 € / Mo. dauerhaft auf das Infrastruktur-Bündel.', 22, 96);
      doc.text(`Laufzeit-Synchronisation: Co-Terminus bis Schuljahresende (${upgradeInfo.effectiveEndDateFormatted}).`, 22, 103);
      doc.text('Datenschutz (Art. 28 DSGVO): AVV automatisch um neue Modul-Verarbeitungskategorien erweitert.', 22, 110);
      doc.text('Sofortige Freischaltung: Alle Funktionen ab sofort für Lehrkräfte & Schüler aktiv.', 22, 117);

      // Legal compliance footer
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Dieses Dokument wurde elektronisch erstellt und ist gem. § 311 Abs. 1 BGB i.V.m. § 126b BGB rechtsverbindlich.', 16, 160);
      doc.text('Campus-Groovelab Cloud Services • Hosting & School Management Infrastructure', 16, 165);

      doc.save(`Vertragsaenderung_Kombi_Paket_${sName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (e) {
      console.error("Error generating upgrade PDF:", e);
    }
  };

  const getDynamicAnnualPrice = useCallback((startDateStr: string | null | undefined, discountPercentOrCoFinancing: number | boolean = 0): number => {
    const contractDateObj = startDateStr ? new Date(startDateStr) : new Date('2026-06-12T19:30:38+02:00');
    const month = contractDateObj.getMonth() + 1; // 1-indexed

    const monthsMap: Record<number, number> = {
      9: 12, 10: 11, 11: 10, 12: 9, 1: 8, 2: 7, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1
    };

    const monthsRemaining = monthsMap[month] !== undefined ? monthsMap[month] : 12;
    const basePrice = effectiveSchoolRates.priceStudent * (masterPricing.billingMonthsPerYear || 11);
    const fullPrice = (monthsRemaining / 12) * basePrice;
    
    let discountPercent = 0;
    if (typeof discountPercentOrCoFinancing === 'boolean') {
      discountPercent = discountPercentOrCoFinancing ? 10 : 0;
    } else {
      discountPercent = discountPercentOrCoFinancing;
    }
    
    const finalPrice = fullPrice * (1 - discountPercent / 100);
    return parseFloat(finalPrice.toFixed(2));
  }, [effectiveSchoolRates.priceStudent, masterPricing.billingMonthsPerYear]);

  const handleDeveloperReset = async () => {
    const simulated = typeof window !== 'undefined' ? localStorage.getItem(`simulatedContractStartDate_${schoolId}`) : null;
    try {
      const { error } = await supabase
        .from('schools')
        .update({
          is_billing_booked: false,
          has_campus_subscription: false,
          has_groovelab_subscription: false,
          campus_activated_this_month: false,
          groovelab_activated_this_month: false,
          contract_start_date: simulated || null,
          contract_ends_at: null,
          student_billing_option: 'option2',
          extra_billing_option: 'option1',
          user_quota: 150,
          pending_user_quota: null
        })
        .eq('id', schoolId);
      if (error) throw error;

      try {
        await supabase
          .from('pilot_agreements')
          .delete()
          .eq('school_id', schoolId);
      } catch (e) {}

      if (typeof window !== 'undefined') {
        localStorage.removeItem(`isBillingBooked_${schoolId}`);
        localStorage.removeItem(`hasCampusSub_${schoolId}`);
        localStorage.removeItem(`hasGroovelabSub_${schoolId}`);
        localStorage.removeItem(`studentBillingOption_${schoolId}`);
        localStorage.removeItem(`isCancelled_${schoolId}`);
        localStorage.removeItem(`pilotSigned_${schoolId}`);
      }
      setIsBillingBooked(false);
      setHasCampusSub(false);
      setHasGroovelabSub(false);
      setIsCancelled(false);
      setSchoolContractEndsAt(null);
      alert('Entwickler-Reset erfolgreich: Schule auf Vor-Vertragszustand zurückgesetzt.');
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Entwickler-Reset: ' + err.message);
    }
  };

  // ─── HYDRATION HELPER (Used in fetchDashboardData) ───
  const initBillingFromSchool = useCallback((schoolData: any) => {
    if (!schoolData) return;

    const storedIsBookedStr = typeof window !== 'undefined' ? localStorage.getItem(`isBillingBooked_${schoolId}`) : null;
    let isBooked = schoolData.is_billing_booked;
    if (storedIsBookedStr !== null) {
      isBooked = storedIsBookedStr === 'true';
    }

    const dbCampus = schoolData.has_campus_subscription;
    const dbGroove = schoolData.has_groovelab_subscription;
    let effectiveCampus = false;
    let effectiveGroove = false;

    if (dbCampus === null || dbCampus === undefined) {
      if (isBooked) {
        const storedCampus = typeof window !== 'undefined' ? localStorage.getItem(`hasCampusSub_${schoolId}`) : null;
        const storedGroove = typeof window !== 'undefined' ? localStorage.getItem(`hasGroovelabSub_${schoolId}`) : null;
        if (storedCampus !== null || storedGroove !== null) {
          effectiveCampus = storedCampus === 'true';
          effectiveGroove = storedGroove === 'true';
        } else {
          effectiveCampus = true;
          effectiveGroove = true;
        }
      }
    } else {
      effectiveCampus = Boolean(dbCampus);
      effectiveGroove = Boolean(dbGroove);
    }

    setHasCampusSub(effectiveCampus);
    setHasGroovelabSub(effectiveGroove);
    schoolData.has_campus_subscription = effectiveCampus;
    schoolData.has_groovelab_subscription = effectiveGroove;
    if (typeof window !== 'undefined') {
      localStorage.setItem(`hasCampusSub_${schoolId}`, String(effectiveCampus));
      localStorage.setItem(`hasGroovelabSub_${schoolId}`, String(effectiveGroove));
    }

    if (isBooked && (dbCampus === null || dbCampus === undefined || (!dbCampus && !dbGroove))) {
      supabase
        .from('schools')
        .update({
          has_campus_subscription: effectiveCampus,
          has_groovelab_subscription: effectiveGroove
        })
        .eq('id', schoolId)
        .then();
    }

    setCampusActivatedThisMonth(schoolData.campus_activated_this_month ?? false);
    setGroovelabActivatedThisMonth(schoolData.groovelab_activated_this_month ?? false);

    const uq = schoolData.user_quota || 150;
    setUserQuota(uq);
    setActiveUserQuota(uq);
    setPendingUserQuota(schoolData.pending_user_quota);

    // Calculate bookedExtraUsers from user_quota (anything above 150 is extra)
    const extraFromDb = Math.max(0, uq - 150);
    setBookedExtraUsers(extraFromDb);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`bookedExtraUsers_${schoolId}`, extraFromDb.toString());
    }

    // Restore contractStartDate from DB contract_start_date or created_at
    if (schoolData.contract_start_date) {
      setContractStartDate(schoolData.contract_start_date);
      if (typeof window !== 'undefined') localStorage.setItem(`contractStartDate_${schoolId}`, schoolData.contract_start_date);
    } else if (typeof window !== 'undefined') {
      const simulated = localStorage.getItem(`simulatedContractStartDate_${schoolId}`);
      if (simulated) {
        setContractStartDate(simulated);
        localStorage.setItem(`contractStartDate_${schoolId}`, simulated);
      } else if (schoolData.created_at) {
        setContractStartDate(schoolData.created_at);
        localStorage.setItem(`contractStartDate_${schoolId}`, schoolData.created_at);
      }
    }

    if (schoolData.extra_billing_option) {
      setExtraBillingOption(schoolData.extra_billing_option);
    }

    // Restore isCancelled and schoolContractEndsAt
    const dbIsCancelled = !!schoolData.contract_ends_at;
    setSchoolContractEndsAt(schoolData.contract_ends_at || null);
    if (dbIsCancelled) {
      setIsCancelled(true);
      if (typeof window !== 'undefined') localStorage.setItem(`isCancelled_${schoolId}`, 'true');
    } else {
      setIsCancelled(false);
      if (typeof window !== 'undefined') localStorage.removeItem(`isCancelled_${schoolId}`);
    }

    if (isBooked) {
      setIsBillingBooked(true);
      setIsSchoolTrial(false);
      setSchoolStatus('active');
      if (typeof window !== 'undefined') {
        localStorage.setItem(`isBillingBooked_${schoolId}`, 'true');
      }
      setHasCampusSub(effectiveCampus);
      setHasGroovelabSub(effectiveGroove);
      const billingOpt = schoolData.student_billing_option || 'option2';
      setStudentBillingOption(billingOpt);
      setBillingPayer((billingOpt === 'option2' || billingOpt === 'option3_2' || billingOpt === 'option3_3') ? 'school' : 'student');
    } else {
      setIsBillingBooked(false);
      if (typeof window !== 'undefined' && storedIsBookedStr !== 'false') {
        localStorage.removeItem(`isBillingBooked_${schoolId}`);
      }
      setHasCampusSub(false);
      setHasGroovelabSub(false);
    }
  }, [schoolId, supabase]);

  return {
    // Subscription States
    hasCampusSub,
    setHasCampusSub,
    hasGroovelabSub,
    setHasGroovelabSub,
    campusActivatedThisMonth,
    setCampusActivatedThisMonth,
    groovelabActivatedThisMonth,
    setGroovelabActivatedThisMonth,
    studentBillingOption,
    setStudentBillingOption,
    isBillingBooked,
    setIsBillingBooked,
    bookedExtraUsers,
    setBookedExtraUsers,
    extraUsersSliderVal,
    setExtraUsersSliderVal,
    extraBillingOption,
    setExtraBillingOption,
    nextBillingOption,
    setNextBillingOption,
    nextBillingOptionEffectiveAt,
    setNextBillingOptionEffectiveAt,
    showChangeTariffModal,
    setShowChangeTariffModal,
    showCheckoutModal,
    setShowCheckoutModal,
    checkoutStep,
    setCheckoutStep,
    billingPayer,
    setBillingPayer,
    showSuccessModal,
    setShowSuccessModal,
    customUmlageAmount,
    setCustomUmlageAmount,
    agreedToTerms,
    setAgreedToTerms,
    couponCode,
    setCouponCode,
    isCouponApplied,
    setIsCouponApplied,
    couponDiscount,
    setCouponDiscount,
    showCouponInput,
    setShowCouponInput,
    hasCustomBillingAddress,
    setHasCustomBillingAddress,
    customBillingName,
    setCustomBillingName,
    customBillingStreet,
    setCustomBillingStreet,
    customBillingZip,
    setCustomBillingZip,
    customBillingCity,
    setCustomBillingCity,
    customBillingEmail,
    setCustomBillingEmail,
    customBillingLeitwegId,
    setCustomBillingLeitwegId,
    hasCustomActivationBillingAddress,
    setHasCustomActivationBillingAddress,
    customActivationBillingName,
    setCustomActivationBillingName,
    customActivationBillingStreet,
    setCustomActivationBillingStreet,
    customActivationBillingZip,
    setCustomActivationBillingZip,
    customActivationBillingCity,
    setCustomActivationBillingCity,
    customActivationBillingEmail,
    setCustomActivationBillingEmail,
    selectedStorageAddonGb,
    setSelectedStorageAddonGb,
    selectedStorageAddonFee,
    setSelectedStorageAddonFee,
    showStorageManagerModal,
    setShowStorageManagerModal,
    isSubmittingStorage,
    setIsSubmittingStorage,
    storageBookingSuccessModal,
    setStorageBookingSuccessModal,
    showSwitchBillingModelModal,
    setShowSwitchBillingModelModal,
    selectedSwitchTargetPayer,
    setSelectedSwitchTargetPayer,
    isSwitchingPayer,
    setIsSwitchingPayer,
    showStorageTerminationModal,
    setShowStorageTerminationModal,
    storageTerminationDays,
    setStorageTerminationDays,
    agreedToSepa,
    setAgreedToSepa,
    selectedInvoice,
    setSelectedInvoice,
    showConfirmExtra,
    setShowConfirmExtra,
    isSchoolTrial,
    setIsSchoolTrial,
    schoolTrialEndsAt,
    setSchoolTrialEndsAt,
    schoolStatus,
    setSchoolStatus,
    subscriptionBypass,
    setSubscriptionBypass,
    contractStartDate,
    setContractStartDate,
    isCancelled,
    setIsCancelled,
    schoolContractEndsAt,
    setSchoolContractEndsAt,
    cancellationReason,
    setCancellationReason,
    lastCancellationId,
    setLastCancellationId,
    showCancelModal,
    setShowCancelModal,
    showModuleUpgradeModal,
    setShowModuleUpgradeModal,
    upgradeTargetModule,
    setUpgradeTargetModule,
    upgradeProcessing,
    setUpgradeProcessing,

    // Quotas
    userQuota,
    setUserQuota,
    activeUserQuota,
    setActiveUserQuota,
    pendingUserQuota,
    setPendingUserQuota,
    handleSaveQuota,

    // Tariff Bookings
    tariffBookings,
    setTariffBookings,
    loadingTariffBookings,
    setLoadingTariffBookings,
    fetchTariffBookings,

    // Trials
    trialLogs,
    setTrialLogs,
    trialLogsLoading,
    setTrialLogsLoading,
    fetchTrialLogs,
    generateMailtoLink,
    handleConfirmStudentTrial,
    handleDeactivateStudentTrial,
    trialDaysRemaining,
    isTrialExpired,
    getTrialDaysRemaining,

    // Documents & Pricing
    getSchoolYearEndInfo,
    getRemainingMonthsAndPrice,
    getDynamicAnnualPrice,
    downloadCancellationReceiptPdf,
    downloadUpgradeConfirmationPdf,
    handleDeveloperReset,

    // Handlers
    handleToggleCampusSub,
    handleToggleGroovelabSub,
    handleUpdateStudentBillingOption,
    handleUpdateExtraBillingOption,
    initBillingFromSchool
  };
};
