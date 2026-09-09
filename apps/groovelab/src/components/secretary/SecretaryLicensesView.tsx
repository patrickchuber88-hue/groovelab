import React, { useState } from 'react';
import {
  AlertCircle, BarChart2, Calendar, ChevronRight, Clock, CreditCard,
  Download, FileText, HardDrive, Info, Lock, RefreshCw, ScrollText,
  Search, Sparkles, Cloud, Zap, Rocket, Crown, Database, ShieldCheck,
  School, Users, Award, CheckCircle2
} from 'lucide-react';
import { CampusGroovelabText } from '../CampusGroovelabBrand';
import { generateTariffReceiptPDF } from '../../utils/tariffReceiptPdfGenerator';
import { StorageTier, DEFAULT_STORAGE_TIERS } from '../../domain/pricingEngine';
import {
  getSchoolYearEndInfo,
  downloadCancellationReceiptPdf,
  downloadUpgradeConfirmationPdf,
  getDynamicAnnualPrice as calcDynamicAnnualPrice
} from './licenses/licenseUtils';
import { generateStaffCouncilDeclarationPDF } from '../../utils/staffCouncilDeclarationGenerator';
import { generateDpoComplianceDossierPDF } from '../../utils/dpoComplianceDossierGenerator';
import { generateEnterpriseSecurityWhitepaperPDF } from '../../utils/securityWhitepaperGenerator';
import { generateMessengerSafetyCertificatePDF } from '../../utils/messengerSafetyCertificateGenerator';

export interface SecretaryLicensesViewProps {
  schoolId: string;
  schoolNumericId?: number | string;
  schoolName?: string;
  schoolStreet?: string;
  schoolHouseNumber?: string;
  schoolZipCode?: string;
  schoolCity?: string;
  currentSchoolProfile: any;
  setCurrentSchoolProfile: React.Dispatch<React.SetStateAction<any>>;
  supabase: any;
  allTeachers: any[];
  employees: any[];
  students: any[];
  activeStudentsCount_global: number;
  activeGroovelabStudentsCount_global: number;
  passiveStudentsCount_global: number;
  billableTeachersCount: number;
  teacherServiceFeeTotal_global: number;
  moduleCost_global: number;
  storageAddonFee_global: number;
  baseB2B_global: number;
  masterRates: any;
  effectiveSchoolRates: any;
  masterPricing: any;
  isSammelzahler: boolean;
  fetchDashboardData: () => Promise<void>;
  fetchTariffBookings: () => Promise<void>;
  hasCampusSub: boolean;
  setHasCampusSub: (val: boolean) => void;
  hasGroovelabSub: boolean;
  setHasGroovelabSub: (val: boolean) => void;
  campusActivatedThisMonth: boolean;
  setCampusActivatedThisMonth: (val: boolean) => void;
  groovelabActivatedThisMonth: boolean;
  setGroovelabActivatedThisMonth: (val: boolean) => void;
  handleToggleCampusSub: (val: boolean) => Promise<void>;
  handleToggleGroovelabSub: (val: boolean) => Promise<void>;
  studentBillingOption: string;
  setStudentBillingOption: (val: string) => void;
  isBillingBooked: boolean;
  setIsBillingBooked: (val: boolean) => void;
  bookedExtraUsers: number;
  setBookedExtraUsers: (val: number) => void;
  extraUsersSliderVal: number;
  setExtraUsersSliderVal: (val: number) => void;
  extraBillingOption: string;
  setExtraBillingOption: (val: string) => void;
  nextBillingOption: string;
  setNextBillingOption: (val: string) => void;
  nextBillingOptionEffectiveAt: string;
  setNextBillingOptionEffectiveAt: (val: string) => void;
  showChangeTariffModal: boolean;
  setShowChangeTariffModal: (val: boolean) => void;
  showCheckoutModal: boolean;
  setShowCheckoutModal: (val: boolean) => void;
  checkoutStep: number;
  setCheckoutStep: (val: number) => void;
  billingPayer: 'school' | 'student';
  setBillingPayer: (val: 'school' | 'student') => void;
  showSuccessModal: boolean;
  setShowSuccessModal: (val: boolean) => void;
  customUmlageAmount: number;
  setCustomUmlageAmount: (val: number) => void;
  agreedToTerms: boolean;
  setAgreedToTerms: (val: boolean) => void;
  couponCode: string;
  setCouponCode: (val: string) => void;
  isCouponApplied: boolean;
  setIsCouponApplied: (val: boolean) => void;
  couponDiscount: number;
  setCouponDiscount: (val: number) => void;
  showCouponInput: boolean;
  setShowCouponInput: (val: boolean) => void;
  hasCustomBillingAddress: boolean;
  setHasCustomBillingAddress: (val: boolean) => void;
  customBillingName: string;
  setCustomBillingName: (val: string) => void;
  customBillingStreet: string;
  setCustomBillingStreet: (val: string) => void;
  customBillingZip: string;
  setCustomBillingZip: (val: string) => void;
  customBillingCity: string;
  setCustomBillingCity: (val: string) => void;
  customBillingEmail: string;
  setCustomBillingEmail: (val: string) => void;
  customBillingLeitwegId?: string;
  setCustomBillingLeitwegId?: (val: string) => void;
  setShowAvvModal?: (val: boolean) => void;
  hasCustomActivationBillingAddress: boolean;
  setHasCustomActivationBillingAddress: (val: boolean) => void;
  customActivationBillingName: string;
  setCustomActivationBillingName: (val: string) => void;
  customActivationBillingStreet: string;
  setCustomActivationBillingStreet: (val: string) => void;
  customActivationBillingZip: string;
  setCustomActivationBillingZip: (val: string) => void;
  customActivationBillingCity: string;
  setCustomActivationBillingCity: (val: string) => void;
  customActivationBillingEmail: string;
  setCustomActivationBillingEmail: (val: string) => void;
  selectedStorageAddonGb: number;
  setSelectedStorageAddonGb: (val: number) => void;
  selectedStorageAddonFee: number;
  setSelectedStorageAddonFee: (val: number) => void;
  showStorageManagerModal: boolean;
  setShowStorageManagerModal: (val: boolean) => void;
  showSwitchBillingModelModal: boolean;
  setShowSwitchBillingModelModal: (val: boolean) => void;
  selectedSwitchTargetPayer: 'school' | 'student';
  setSelectedSwitchTargetPayer: (val: 'school' | 'student') => void;
  showStorageTerminationModal: boolean;
  setShowStorageTerminationModal: (val: boolean) => void;
  agreedToSepa: boolean;
  setAgreedToSepa: (val: boolean) => void;
  selectedInvoice: any;
  setSelectedInvoice: (val: any) => void;
  showConfirmExtra: boolean;
  setShowConfirmExtra: (val: boolean) => void;
  isSchoolTrial: boolean;
  setIsSchoolTrial: (val: boolean) => void;
  schoolTrialEndsAt: string | null;
  setSchoolTrialEndsAt: (val: string | null) => void;
  schoolStatus: string;
  setSchoolStatus: (val: string) => void;
  subscriptionBypass: boolean;
  contractStartDate: string | null;
  setContractStartDate: (val: string | null) => void;
  simulatedToday: string;
  setSimulatedToday: (val: string) => void;
  expandedYears: Record<string, boolean>;
  setExpandedYears: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  isCancelled: boolean;
  setIsCancelled: (val: boolean) => void;
  schoolContractEndsAt: string | null;
  setSchoolContractEndsAt: (val: string | null) => void;
  showModuleUpgradeModal: boolean;
  setShowModuleUpgradeModal: (val: boolean) => void;
  setUpgradeTargetModule: (val: 'campus' | 'groovelab') => void;
  setShowCancelModal: (val: boolean) => void;
  tariffBookings: any[];
  loadingTariffBookings: boolean;
  activeStudentsModalList: any;
  setActiveStudentsModalList: (val: any) => void;
  getEffectiveStorageUsedBytes: (profile: any) => number;
  isSecretaryReadOnly?: boolean;
  onOpenDunningPayModal?: (inv?: any) => void;
}

export function SecretaryLicensesView(props: SecretaryLicensesViewProps) {
  const {
    schoolId,
    schoolNumericId,
    schoolName,
    schoolStreet,
    schoolHouseNumber,
    schoolZipCode,
    schoolCity,
    currentSchoolProfile,
    setCurrentSchoolProfile,
    supabase,
    allTeachers,
    employees,
    students,
    activeStudentsCount_global,
    activeGroovelabStudentsCount_global,
    passiveStudentsCount_global,
    billableTeachersCount,
    teacherServiceFeeTotal_global,
    moduleCost_global,
    storageAddonFee_global,
    baseB2B_global,
    masterRates,
    effectiveSchoolRates,
    masterPricing,
    isSammelzahler,
    fetchDashboardData,
    fetchTariffBookings,
    hasCampusSub,
    setHasCampusSub,
    hasGroovelabSub,
    setHasGroovelabSub,
    campusActivatedThisMonth,
    setCampusActivatedThisMonth,
    groovelabActivatedThisMonth,
    setGroovelabActivatedThisMonth,
    handleToggleCampusSub,
    handleToggleGroovelabSub,
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
    setShowAvvModal,
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
    showSwitchBillingModelModal,
    setShowSwitchBillingModelModal,
    selectedSwitchTargetPayer,
    setSelectedSwitchTargetPayer,
    showStorageTerminationModal,
    setShowStorageTerminationModal,
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
    contractStartDate,
    setContractStartDate,
    simulatedToday,
    setSimulatedToday,
    expandedYears,
    setExpandedYears,
    isCancelled,
    setIsCancelled,
    schoolContractEndsAt,
    setSchoolContractEndsAt,
    showModuleUpgradeModal,
    setShowModuleUpgradeModal,
    setUpgradeTargetModule,
    setShowCancelModal,
    tariffBookings,
    loadingTariffBookings,
    activeStudentsModalList,
    setActiveStudentsModalList,
    getEffectiveStorageUsedBytes,
    isSecretaryReadOnly = false,
    onOpenDunningPayModal
  } = props;

  // Local state for active tab inside booked licenses view
  const [activeBillingSubTab, setActiveBillingSubTab] = useState<'overview' | 'matching' | 'history' | 'ledger' | 'compliance'>('overview');
  const [localLeitwegId, setLocalLeitwegId] = useState<string>(() => currentSchoolProfile?.leitweg_id || '');
  const effectiveLeitwegId = customBillingLeitwegId !== undefined ? customBillingLeitwegId : localLeitwegId;
  const handleLeitwegChange = (val: string) => {
    setLocalLeitwegId(val);
    if (setCustomBillingLeitwegId) setCustomBillingLeitwegId(val);
  };
  const [lastCancellationId, setLastCancellationId] = useState<string>('');
  const [selectedDashboardMonth, setSelectedDashboardMonth] = useState<number>(() => new Date().getMonth());
  const [selectedDashboardYear, setSelectedDashboardYear] = useState<number>(() => new Date().getFullYear());
  const [activationSearchQuery, setActivationSearchQuery] = useState<string>('');

  const deMonths = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

  const getDynamicAnnualPrice = (startDateStr: string | null | undefined, discountPercentOrCoFinancing: number | boolean = 0) => {
    return calcDynamicAnnualPrice(startDateStr, discountPercentOrCoFinancing, effectiveSchoolRates.priceStudent, masterPricing.billingMonthsPerYear);
  };

  return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="google-card" style={{ paddingLeft: '44px' }}>
              <div className="google-kpi-bar bg-google-red" />
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', opacity: 0.8 }}><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>
                Abrechnung &amp; Infrastruktur
              </h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>Verwalte deine aktiven Module und buche zusätzliche Schülerzugänge.</span>
                <span style={{ fontSize: '0.74rem', color: '#34a853', background: '#e6f4ea', padding: '4px 10px', borderRadius: '100px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  🔒 DSGVO-konform auf deutschen Servern
                </span>
              </p>

              {(() => {
                const effectiveContractStartDateStr = isBillingBooked
                  ? contractStartDate
                  : (simulatedToday ? simulatedToday + 'T12:00:00' : new Date().toISOString());
                const contractDateObj = effectiveContractStartDateStr ? new Date(effectiveContractStartDateStr) : new Date('2026-06-12T19:30:38+02:00');
                const cMonth = contractDateObj.getMonth() + 1;
                const isStarterFlat = false;
                const billedCampus = isBillingBooked ? (hasCampusSub || campusActivatedThisMonth) : hasCampusSub;
                const billedGroovelab = isBillingBooked ? (hasGroovelabSub || groovelabActivatedThisMonth) : hasGroovelabSub;
                const activeModulesCount = (billedCampus ? 1 : 0) + (billedGroovelab ? 1 : 0);
                const moduleCost = (billedCampus && billedGroovelab) ? masterRates.kombi : ((billedCampus ? masterRates.campus : 0) + (billedGroovelab ? masterRates.groovelab : 0));
                const studentLevyMonthly = (billingPayer === 'school' && studentBillingOption === 'option2') ? activeStudentsCount_global * masterRates.student : 0;
                const extraLevyMonthly = extraBillingOption === 'option2' ? bookedExtraUsers * masterRates.teacher : 0;

                const baseB2B = moduleCost + allTeachers.filter((t: any) => t.isActive ?? true).length * masterRates.teacher + ((billingPayer === 'student' && studentBillingOption === 'student_partial') ? students.length * 0.09 : Math.max(0, students.length - activeStudentsCount_global) * 0.09);
                const studentSharePreview = 0;
                const isAnnual = studentBillingOption === 'option1' || studentBillingOption === 'debit' || studentBillingOption === 'cash' || studentBillingOption === 'both' || studentBillingOption === 'student_full' || studentBillingOption === 'student_partial';
                
                // Slider prospective change variables (Real-time preview)
                const extraLevyMonthlyAdditional = (extraBillingOption === 'option2' ? extraUsersSliderVal * masterRates.teacher : 0);
                const extraLevyYearlyAdditional = (extraBillingOption === 'option1' ? extraUsersSliderVal * getDynamicAnnualPrice(effectiveContractStartDateStr, false) : 0);
                const isAnnualAdditional = extraBillingOption === 'option1';
                const schoolShareAdditional = 0;

                // B2B total
                const currentTotalB2B = baseB2B;
                
                // Mixed Total B2B + B2C
                const mixedTotal = currentTotalB2B + studentLevyMonthly + extraLevyMonthly;

                return (
                  <>
                    {!isBillingBooked ? (
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1.7fr 1.3fr', 
                        gap: '28px', 
                        alignItems: 'start', 
                        textAlign: 'left',
                        marginTop: '10px'
                      }}>
                        {/* Left Column: Wizard Steps */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                          
                          {/* Visual Step Progress Bar - Apple HIG Enterprise Standard */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '14px 24px',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '20px',
                            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.03)',
                            overflowX: 'auto'
                          }}>
                            {[
                              { step: 1, label: 'Module wählen' },
                              { step: 2, label: 'Kostenträger' },
                              { step: 3, label: 'Cloud-Speicher' },
                              { step: 4, label: 'Rechnungsadresse' },
                              { step: 5, label: 'Bestätigen & Buchen' }
                            ].map((s, index, arr) => {
                              const isCurrent = checkoutStep === s.step;
                              const isPassed = checkoutStep > s.step;
                              return (
                                <div key={s.step} style={{ display: 'flex', alignItems: 'center', flex: index < arr.length - 1 ? 1 : 'none', minWidth: 'max-content' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{
                                      width: '28px',
                                      height: '28px',
                                      minWidth: '28px',
                                      minHeight: '28px',
                                      maxWidth: '28px',
                                      maxHeight: '28px',
                                      flexShrink: 0,
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.75rem',
                                      fontWeight: 800,
                                      background: isPassed 
                                        ? '#34a853' 
                                        : (isCurrent ? '#34a853' : '#f1f5f9'),
                                      color: isPassed || isCurrent 
                                        ? '#ffffff' 
                                        : '#94a3b8',
                                      border: isPassed || isCurrent 
                                        ? 'none' 
                                        : '1px solid #e2e8f0',
                                      boxShadow: isCurrent 
                                        ? '0 2px 8px rgba(52, 168, 83, 0.35)' 
                                        : 'none',
                                      boxSizing: 'border-box',
                                      transition: 'all 0.25s ease'
                                    }}>
                                      {isPassed ? (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                          <polyline points="20 6 9 17 4 12"/>
                                        </svg>
                                      ) : s.step}
                                    </div>
                                    <span style={{ 
                                      fontSize: '0.78rem', 
                                      fontWeight: isCurrent ? 800 : (isPassed ? 700 : 500), 
                                      color: isCurrent ? '#0f172a' : (isPassed ? '#15803d' : '#94a3b8'),
                                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Outfit", sans-serif',
                                      letterSpacing: '-0.01em',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      {s.label}
                                    </span>
                                  </div>
                                  {index < arr.length - 1 && (
                                    <div style={{ 
                                      flex: 1, 
                                      height: '2px', 
                                      background: isPassed ? '#34a853' : '#e2e8f0', 
                                      margin: '0 12px', 
                                      borderRadius: '9999px',
                                      minWidth: '16px',
                                      transition: 'all 0.3s ease' 
                                    }} />
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Wizard Step Content */}
                          {checkoutStep === 1 && (
                            <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                              <div>
                                <span style={{ fontSize: '0.62rem', background: '#e6f4ea', color: '#34a853', padding: '4px 10px', borderRadius: '100px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schritt 1 von 5</span>
                                <h4 style={{ margin: '8px 0 4px 0', fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', fontFamily: 'Urbanist' }}>Welche Module möchtest du buchen?</h4>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: '1.4' }}>
                                  Wähle die gewünschten Bereiche für deine Musikschule aus. Server- &amp; Service-Bereitstellungskosten fallen nur für Team-Profile und gebuchte Schüler an.
                                </p>
                              </div>

                              {/* Kombi-Vorteil Promo Banner */}
                              <div style={{
                                background: 'linear-gradient(135deg, #fef08a 0%, #fef9c3 100%)',
                                border: '1.5px solid #eab308',
                                borderRadius: '16px',
                                padding: '12px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                fontSize: '0.74rem',
                                color: '#854d0e',
                                fontWeight: 700,
                                boxShadow: '0 4px 15px rgba(234, 179, 8, 0.08)'
                              }}>
                                <Sparkles size={18} color="#854d0e" style={{ flexShrink: 0 }} />
                                <div>
                                  <span><strong>Kombi-Vorteil sichern:</strong> Campus ({masterRates.campus.toFixed(2).replace('.', ',')} €) &amp; GrooveLab ({masterRates.groovelab.toFixed(2).replace('.', ',')} €) im Bundle für nur <strong>{masterRates.kombi.toFixed(2).replace('.', ',')} € / Mo.</strong> statt {(masterRates.campus + masterRates.groovelab).toFixed(2).replace('.', ',')} € / Mo. (du sparst dauerhaft {(masterRates.campus + masterRates.groovelab - masterRates.kombi).toFixed(2).replace('.', ',')} € jeden Monat)!</span>
                                </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                {/* Campus Card */}
                                <div 
                                  onClick={() => handleToggleCampusSub(!hasCampusSub)}
                                  className="selectable-card"
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    padding: '20px',
                                    borderRadius: '20px',
                                    border: '2px solid',
                                    background: hasCampusSub ? '#f0fdf4' : '#ffffff',
                                    borderColor: hasCampusSub ? '#34a853' : '#e2e8f0',
                                    boxShadow: hasCampusSub ? '0 10px 25px rgba(52, 168, 83, 0.08)' : '0 2px 8px rgba(0,0,0,0.02)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    minHeight: '170px'
                                  }}
                                >
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                      <strong style={{ fontSize: '0.9rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34a853" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>
                                        Campus
                                      </strong>
                                      <span style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        border: '2px solid',
                                        borderColor: hasCampusSub ? '#34a853' : '#cbd5e1',
                                        background: hasCampusSub ? '#34a853' : '#f8fafc',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#ffffff',
                                        fontSize: '0.7rem',
                                        fontWeight: 900
                                      }}>
                                        {hasCampusSub && '✓'}
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.68rem', color: '#64748b', marginTop: '6px' }}>
                                       <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#34a853' }}>•</span> Stundenpläne &amp; Raumbelegungspläne</span>
                                       <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#34a853' }}>•</span> Hausaufgabenheft &amp; Ausfall-Cockpit</span>
                                       <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#34a853' }}>•</span> Messenger &amp; Campus Live-Feed</span>
                                       <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#34a853' }}>•</span> Übestreaks sowie Performance &amp; Highlights</span>
                                     </div>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '0.78rem' }}>
                                    <span style={{ fontWeight: 900, color: '#1e293b' }}>{effectiveSchoolRates.priceCampus.toFixed(2).replace('.', ',')} € <span style={{ fontWeight: 400, color: '#64748b' }}>/ Mo.</span></span>
                                    <span style={{ color: hasCampusSub ? '#34a853' : '#94a3b8', fontWeight: 800 }}>{hasCampusSub ? 'Aktiviert' : 'Bereit'}</span>
                                  </div>
                                </div>

                                {/* GrooveLab Card */}
                                <div 
                                  onClick={() => handleToggleGroovelabSub(!hasGroovelabSub)}
                                  className="selectable-card"
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    padding: '20px',
                                    borderRadius: '20px',
                                    border: '2px solid',
                                    background: hasGroovelabSub ? '#fefce8' : '#ffffff',
                                    borderColor: hasGroovelabSub ? '#eab308' : '#e2e8f0',
                                    boxShadow: hasGroovelabSub ? '0 10px 25px rgba(234, 179, 8, 0.08)' : '0 2px 8px rgba(0,0,0,0.02)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    minHeight: '170px'
                                  }}
                                >
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                      <strong style={{ fontSize: '0.9rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                                        GrooveLab
                                      </strong>
                                      <span style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        border: '2px solid',
                                        borderColor: hasGroovelabSub ? '#eab308' : '#cbd5e1',
                                        background: hasGroovelabSub ? '#eab308' : '#f8fafc',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#ffffff',
                                        fontSize: '0.7rem',
                                        fontWeight: 900
                                      }}>
                                        {hasGroovelabSub && '✓'}
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.68rem', color: '#64748b', marginTop: '6px' }}>
                                       <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#eab308' }}>•</span> Interaktives Live-Lab-Board</span>
                                       <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#eab308' }}>•</span> Songs zum Meistern &amp; Übe-Tools</span>
                                       <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#eab308' }}>•</span> Automatisiertes Band-Matching</span>
                                       <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#eab308' }}>•</span> Bandprofile &amp; coole Musiker-Avatare</span>
                                     </div>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '0.78rem' }}>
                                    <span style={{ fontWeight: 900, color: '#1e293b' }}>{effectiveSchoolRates.priceGroovelab.toFixed(2).replace('.', ',')} € <span style={{ fontWeight: 400, color: '#64748b' }}>/ Mo.</span></span>
                                    <span style={{ color: hasGroovelabSub ? '#a16207' : '#94a3b8', fontWeight: 800 }}>{hasGroovelabSub ? 'Aktiviert' : 'Bereit'}</span>
                                  </div>
                                </div>
                              </div>

                              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '12px 14px', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.74rem', color: '#475569' }}>
                                <span>💡</span>
                                <span>
                                  <strong>Service-Gebühr für Lehrer &amp; Verwaltung:</strong> Aktuell sind <strong>{allTeachers.filter((t: any) => t.isActive ?? true).length} aktive Lehrer</strong> eingetragen ({effectiveSchoolRates.priceTeacher.toFixed(2).replace('.', ',')} € / Monat pro Profil, entspricht {((allTeachers.filter((t: any) => t.isActive ?? true).length) * effectiveSchoolRates.priceTeacher).toFixed(2).replace('.', ',')} € / Mo. Netto). Die <strong>{employees.filter((e: any) => e.isActive ?? true).length} Verwaltungs- &amp; Sekretariats-Nutzer</strong> sind vollständig kostenlos in den gebuchten Modulen enthalten.
                                </span>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                                <button 
                                  onClick={() => {
                                    if (!hasCampusSub && !hasGroovelabSub) return;
                                    setCheckoutStep(2);
                                  }}
                                  disabled={!hasCampusSub && !hasGroovelabSub}
                                  style={{
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: (!hasCampusSub && !hasGroovelabSub) ? '#cbd5e1' : '#34a853',
                                    color: '#ffffff',
                                    fontSize: '0.8rem',
                                    fontWeight: 800,
                                    cursor: (!hasCampusSub && !hasGroovelabSub) ? 'not-allowed' : 'pointer',
                                    boxShadow: (!hasCampusSub && !hasGroovelabSub) ? 'none' : '0 4px 12px rgba(52, 168, 83, 0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  {!hasCampusSub && !hasGroovelabSub ? 'Wähle mindestens 1 Modul' : 'Weiter zum Kostenträger'}
                                  {(hasCampusSub || hasGroovelabSub) && <span>➔</span>}
                                </button>
                              </div>
                            </div>
                          )}

                          {checkoutStep === 2 && (
                            <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                              <div>
                                <span style={{ fontSize: '0.62rem', background: '#e6f4ea', color: '#34a853', padding: '4px 10px', borderRadius: '100px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schritt 2 von 5</span>
                                <h4 style={{ margin: '8px 0 4px 0', fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', fontFamily: 'Urbanist' }}>Wer trägt die Kosten für die Schüleraktivierungen?</h4>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: '1.4' }}>
                                  Die Abrechnung läuft grundsätzlich über die Musikschule. Entscheide hier, wer die Kosten für die Schüleraktivierungen übernimmt.
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#b45309', marginTop: '4px', fontWeight: 600 }}>
                                    <AlertCircle size={12} color="#b45309" style={{ flexShrink: 0 }} /> Hinweis: Aktivierungen können nur für das Campus-Modul auf Schüler/Eltern umgelegt werden. GrooveLab-Aktivierungen werden immer von der Schule getragen.
                                  </span>
                                </p>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                {/* Option A: Schule Card */}
                                <div 
                                  onClick={() => {
                                    setBillingPayer('school');
                                    setStudentBillingOption('option2');
                                  }}
                                  className="selectable-card"
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    padding: '20px',
                                    borderRadius: '20px',
                                    border: '2px solid',
                                    background: '#ffffff',
                                    borderColor: billingPayer === 'school' ? '#34a853' : 'rgba(0,0,0,0.06)',
                                    boxShadow: billingPayer === 'school' ? '0 10px 25px rgba(52, 168, 83, 0.05)' : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    minHeight: '170px'
                                  }}
                                >
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                      <strong style={{ fontSize: '0.88rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        🏫 Musikschule übernimmt alle Kosten (Sammelzahler)
                                      </strong>
                                      <span style={{
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '50%',
                                        border: '2px solid',
                                        borderColor: billingPayer === 'school' ? '#34a853' : '#cbd5e1',
                                        background: billingPayer === 'school' ? '#34a853' : 'transparent',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#ffffff',
                                        fontSize: '0.65rem'
                                      }}>
                                        {billingPayer === 'school' && '✓'}
                                      </span>
                                    </div>
                                    <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', lineHeight: '1.35' }}>
                                      Die Musikschule übernimmt alle Gebühren gesammelt. Für Eltern und Schüler ist die Nutzung komplett kostenfrei. Keine Direktabrechnung erforderlich.
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '0.74rem', color: '#34a853', fontWeight: 800, textAlign: 'right', marginTop: '12px' }}>
                                    {billingPayer === 'school' ? 'Ausgewählt' : 'Auswählen'}
                                  </div>
                                </div>

                                {/* Option B: Schüler Card */}
                                <div 
                                  onClick={() => {
                                    setBillingPayer('student');
                                    setStudentBillingOption('student_full');
                                    setCustomUmlageAmount(effectiveSchoolRates.priceStudent);
                                  }}
                                  className="selectable-card"
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    padding: '20px',
                                    borderRadius: '20px',
                                    border: '2px solid',
                                    background: '#ffffff',
                                    borderColor: billingPayer === 'student' ? '#eab308' : 'rgba(0,0,0,0.06)',
                                    boxShadow: billingPayer === 'student' ? '0 10px 25px rgba(234, 179, 8, 0.05)' : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    minHeight: '170px'
                                  }}
                                >
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                      <strong style={{ fontSize: '0.88rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        👥 Direktabrechnung mit Eltern/Schülern (Zahlungsüberwachung)
                                      </strong>
                                      <span style={{
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '50%',
                                        border: '2px solid',
                                        borderColor: billingPayer === 'student' ? '#eab308' : '#cbd5e1',
                                        background: billingPayer === 'student' ? '#eab308' : 'transparent',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#ffffff',
                                        fontSize: '0.65rem'
                                      }}>
                                        {billingPayer === 'student' && '✓'}
                                      </span>
                                    </div>
                                    <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', lineHeight: '1.35' }}>
                                      Eltern und Schüler zahlen ihren Beitrag direkt an Campus-Groovelab. Die Plattform übernimmt die komplette Zahlungsabwicklung vollautomatisch im Hintergrund und zeigt dir in Echtzeit in der Schülerliste, wer bereits bezahlt hat. Deine Musikschule wird finanziell maximal entlastet – ohne jeglichen Verwaltungsaufwand.
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '0.74rem', color: '#eab308', fontWeight: 800, textAlign: 'right', marginTop: '12px' }}>
                                    {billingPayer === 'student' ? 'Ausgewählt' : 'Auswählen'}
                                  </div>
                                </div>
                              </div>

                              {billingPayer === 'school' && (
                                <div style={{
                                  background: '#e6f4ea',
                                  border: '1.5px solid #34a853',
                                  borderRadius: '20px',
                                  padding: '20px',
                                  marginTop: '8px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '12px'
                                }}>
                                  <strong style={{ fontSize: '0.82rem', color: '#34a853', fontFamily: 'Urbanist' }}>
                                    Abrechnungsmodell für Schüler-Aktivierungen wählen:
                                  </strong>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    
                                    {/* Option 1: Variable monatliche Abrechnung (option2) */}
                                    <label style={{
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: '10px',
                                      cursor: 'pointer',
                                      background: '#ffffff',
                                      border: '1.5px solid',
                                      borderColor: studentBillingOption === 'option2' ? '#34a853' : '#e2e8f0',
                                      borderRadius: '12px',
                                      padding: '12px',
                                      transition: 'all 0.2s',
                                      boxShadow: studentBillingOption === 'option2' ? '0 4px 12px rgba(52, 168, 83, 0.04)' : 'none'
                                    }}>
                                      <input
                                        type="radio"
                                        name="schoolStudentBillingOption"
                                        checked={studentBillingOption === 'option2'}
                                        onChange={() => setStudentBillingOption('option2')}
                                        style={{ marginTop: '3px', accentColor: '#34a853' }}
                                      />
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>
                                          1. Variable monatliche Abrechnung
                                        </span>
                                        <span style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: '1.3' }}>
                                          Grundpreis bleibt gleich. Zweite separate Rechnung mit monatlichen Schüler-Aktivierungskosten verändert sich variabel ({effectiveSchoolRates.priceStudent.toFixed(2).replace('.', ',')} € / Schüler / Mo.).
                                        </span>
                                      </div>
                                    </label>

                                    {/* Option 2: Jahresbeitrag bei Aktivierung (option3_2) */}
                                    <label style={{
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: '10px',
                                      cursor: 'pointer',
                                      background: '#ffffff',
                                      border: '1.5px solid',
                                      borderColor: studentBillingOption === 'option3_2' ? '#34a853' : '#e2e8f0',
                                      borderRadius: '12px',
                                      padding: '12px',
                                      transition: 'all 0.2s',
                                      boxShadow: studentBillingOption === 'option3_2' ? '0 4px 12px rgba(52, 168, 83, 0.04)' : 'none'
                                    }}>
                                      <input
                                        type="radio"
                                        name="schoolStudentBillingOption"
                                        checked={studentBillingOption === 'option3_2'}
                                        onChange={() => setStudentBillingOption('option3_2')}
                                        style={{ marginTop: '3px', accentColor: '#34a853' }}
                                      />
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          2. Jahresbeitrag bei Aktivierung <span style={{ background: '#e6f4ea', color: '#34a853', fontSize: '0.6rem', padding: '1px 6px', borderRadius: '100px', fontWeight: 800 }}>10% Rabatt</span>
                                        </span>
                                        <span style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: '1.3' }}>
                                          Der Grundpreis bleibt gleich. Aktivierungen werden als Jahresbeitrag in einer separaten monatlichen Rechnung voll abgerechnet (inkl. 10% Rabatt).
                                        </span>
                                      </div>
                                    </label>

                                    {/* Option 3: Einmalige Komplett-Aktivierung zum Schuljahresstart (option3_3) */}
                                    <label style={{
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: '10px',
                                      cursor: 'pointer',
                                      background: '#ffffff',
                                      border: '1.5px solid',
                                      borderColor: studentBillingOption === 'option3_3' ? '#34a853' : '#e2e8f0',
                                      borderRadius: '12px',
                                      padding: '12px',
                                      transition: 'all 0.2s',
                                      boxShadow: studentBillingOption === 'option3_3' ? '0 4px 12px rgba(52, 168, 83, 0.04)' : 'none'
                                    }}>
                                      <input
                                        type="radio"
                                        name="schoolStudentBillingOption"
                                        checked={studentBillingOption === 'option3_3'}
                                        onChange={() => setStudentBillingOption('option3_3')}
                                        style={{ marginTop: '3px', accentColor: '#34a853' }}
                                      />
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          3. Einmalige Komplett-Aktivierung zum Schuljahresstart <span style={{ background: '#e6f4ea', color: '#34a853', fontSize: '0.6rem', padding: '1px 6px', borderRadius: '100px', fontWeight: 800 }}>20% Rabatt</span>
                                        </span>
                                        <span style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: '1.3' }}>
                                          Der Grundpreis bleibt monatlich gleich. Zum Schuljahresstart aktiviert die Schule alle Schüler. Einmalig für das komplette Schuljahr für alle Schüler eine separate Aktivierungsrechnung (inkl. 20% Rabatt).
                                        </span>
                                      </div>
                                    </label>

                                  </div>
                                </div>
                              )}

                              {/* Custom Umlage Input & Exemption Info */}
                              {billingPayer === 'student' && (
                                <div style={{
                                  background: '#fffbeb',
                                  border: '1.5px solid #f59e0b',
                                  borderRadius: '20px',
                                  padding: '20px',
                                  marginTop: '8px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '12px'
                                }}>
                                  <strong style={{ fontSize: '0.82rem', color: '#78350f', fontFamily: 'Urbanist' }}>
                                    Abrechnungsmodell für Schüler-Aktivierungen wählen:
                                  </strong>
                                  <span style={{ fontSize: '0.72rem', color: '#78350f', opacity: 0.85, lineHeight: '1.4', marginTop: '-4px' }}>
                                    Die Schule zahlt nur den monatlichen Grundpreis für die schulseitige Infrastruktur. Schüler und Eltern übernehmen die Aktivierung ihres persönlichen Profils selbst.
                                  </span>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    
                                    {/* Option 1: Vollständige Umlage (student_full) */}
                                    <label style={{
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: '10px',
                                      cursor: 'pointer',
                                      background: '#ffffff',
                                      border: '1.5px solid',
                                      borderColor: studentBillingOption === 'student_full' ? '#f59e0b' : '#e2e8f0',
                                      borderRadius: '12px',
                                      padding: '12px',
                                      transition: 'all 0.2s',
                                      boxShadow: studentBillingOption === 'student_full' ? '0 4px 12px rgba(245, 158, 11, 0.04)' : 'none'
                                    }}>
                                      <input
                                        type="radio"
                                        name="studentCampusBillingOption"
                                        checked={studentBillingOption === 'student_full'}
                                        onChange={() => {
                                          setStudentBillingOption('student_full');
                                          setCustomUmlageAmount(effectiveSchoolRates.priceStudent);
                                        }}
                                        style={{ marginTop: '3px', accentColor: '#f59e0b' }}
                                      />
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>
                                          1. Vollständige Direktabrechnung (Einmaliger Jahresbeitrag: {(effectiveSchoolRates.priceStudent * 12).toFixed(2).replace('.', ',')} € – umgerechnet {effectiveSchoolRates.priceStudent.toFixed(2).replace('.', ',')} € / Monat)
                                        </span>
                                        <span style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: '1.3' }}>
                                          Der Schüler/Eltern zahlen den Jahresbeitrag als Einmalzahlung ({(effectiveSchoolRates.priceStudent * 12).toFixed(2).replace('.', ',')} € pro Schuljahr). Monatliche Buchungen sind ausgeschlossen. Die Musikschule wird komplett entlastet (0,00 € Kosten).
                                        </span>
                                      </div>
                                    </label>

                                    {/* Option 2: Teilweise Umlage (student_partial) */}
                                    <label style={{
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: '10px',
                                      cursor: 'pointer',
                                      background: '#ffffff',
                                      border: '1.5px solid',
                                      borderColor: studentBillingOption === 'student_partial' ? '#f59e0b' : '#e2e8f0',
                                      borderRadius: '12px',
                                      padding: '12px',
                                      transition: 'all 0.2s',
                                      boxShadow: studentBillingOption === 'student_partial' ? '0 4px 12px rgba(245, 158, 11, 0.04)' : 'none'
                                    }}>
                                      <input
                                        type="radio"
                                        name="studentCampusBillingOption"
                                        checked={studentBillingOption === 'student_partial'}
                                        onChange={() => {
                                          setStudentBillingOption('student_partial');
                                          setCustomUmlageAmount(0.40);
                                        }}
                                        style={{ marginTop: '3px', accentColor: '#f59e0b' }}
                                      />
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>
                                          2. Teilweise Direktabrechnung (Einmaliger Jahresbeitrag: 4,80 € / CHF 9.60 – umgerechnet 0,40 € / CHF 0.80 / Monat)
                                        </span>
                                        <span style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: '1.3' }}>
                                          Der Schüler/Eltern zahlen den reduzierten Jahresbeitrag von 4,80 € (bzw. CHF 9.60). Monatliche Buchungen sind ausgeschlossen. Die Schule trägt weiterhin die passive Datenbankgebühr.
                                        </span>
                                      </div>
                                    </label>

                                  </div>
                                  <div style={{ fontSize: '0.66rem', color: '#d97706', lineHeight: '1.4', borderTop: '1px solid #fed7aa', paddingTop: '8px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <span>💚 <strong>Solidaritäts- &amp; Härtefall-Schutz (Das 20:1 Prinzip):</strong> Bei der Eltern-Direktabrechnung schaltet das System für <strong>je 20 aktivierte Schüler-Profile automatisch 1 kostenfreie Freischaltung für Härtefälle &amp; Geschwisterkinder</strong> frei (0,00 € für Eltern &amp; Schule). In deiner Schülerverwaltung kannst du begünstigte Schüler manuell als „Härtefall / Geschwisterrabatt“ freischalten.</span>
                                    <span>💡 <strong>GrooveLab-Aktivierungen:</strong> Bitte beachte, dass Aktivierungen für das GrooveLab-Modul immer vollständig von der Musikschule getragen werden und nicht über die Direktabrechnung mit Eltern/Schülern abgewickelt werden können (die Direktabrechnung ist nur für das Campus-Modul möglich).</span>
                                  </div>
                                </div>
                              )}

                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                                <button 
                                  onClick={() => setCheckoutStep(1)}
                                  style={{
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    border: '1.5px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#475569',
                                    fontSize: '0.8rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <span>⇠</span> Zurück
                                </button>
                                <button 
                                  onClick={() => setCheckoutStep(3)}
                                  style={{
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: '#34a853',
                                    color: '#ffffff',
                                    fontSize: '0.8rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(52, 168, 83, 0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  Weiter zum Cloud-Speicher <span>➔</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* DEDICATED STEP 3: AUDIO-TRESOR CLOUD-SPEICHER */}
                          {checkoutStep === 3 && (
                            <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                              <div>
                                <span style={{ fontSize: '0.62rem', background: '#e6f4ea', color: '#34a853', padding: '4px 10px', borderRadius: '100px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schritt 3 von 5</span>
                                <h4 style={{ margin: '8px 0 4px 0', fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', fontFamily: 'Urbanist' }}>🎙️ Audio-Tresor &amp; Cloud-Speicher für Audio-Aufnahmen &amp; Loops</h4>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: '1.45' }}>
                                  Der Basis-Audio-Tresor ist in deinen Modulen bereits standardmäßig enthalten. Um Speicherbegrenzungen aufzuheben und sämtliche Audio-Aufnahmen, Loopstation-Sessions und musikalischen Momente deiner Schüler &amp; Lehrkräfte in hoher Menge verlustfrei festzuhalten, kannst du das gewünschte Speichervolumen passend zu deiner Musikschul-Größe wählen:
                                </p>
                              </div>

                              {/* Pending Provisioning Legal Notice Box */}
                              {(() => {
                                const isPendingHetzner = currentSchoolProfile?.storage_addon_status === 'pending_activation' || 
                                  currentSchoolProfile?.storage_addon_status === 'pending_provisioning' || 
                                  currentSchoolProfile?.storage_addon_status === 'pending_hetzner' || 
                                  (Number(currentSchoolProfile?.storage_addon_pending_gb) > 0);
                                if (!isPendingHetzner) return null;

                                const pendingGb = currentSchoolProfile?.storage_addon_pending_gb || selectedStorageAddonGb || 10;
                                return (
                                  <div style={{
                                    background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                                    border: '1.5px solid #f59e0b',
                                    borderRadius: '16px',
                                    padding: '16px 20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '14px',
                                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)'
                                  }}>
                                    <div style={{
                                      width: '40px',
                                      height: '40px',
                                      borderRadius: '12px',
                                      background: 'rgba(217, 119, 6, 0.15)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      border: '1px solid rgba(217, 119, 6, 0.25)',
                                      flexShrink: 0
                                    }}>
                                      <Clock size={20} color="#b45309" />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#166534' }}>
                                        ⚡ Sofort-Bereitstellung aktiv (+{pendingGb} GB)
                                      </div>
                                      <div style={{ fontSize: '0.75rem', color: '#15803d', lineHeight: 1.45 }}>
                                        Dein gebuchtes Speichervolumen (+{pendingGb} GB Audio-Tresor Cloud-Speicher) ist sofort freigeschaltet und für alle Schüler & Lehrkräfte einsatzbereit.
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Live Storage Meter & Safety Info */}
                              {(() => {
                                const activeAddonGb = Number(currentSchoolProfile?.storage_addon_gb || 0);
                                const baseGb = 1.0;
                                const currentTotalCapGb = baseGb + activeAddonGb;
                                const usedBytes = getEffectiveStorageUsedBytes(currentSchoolProfile);
                                const usedGb = usedBytes / (1024 * 1024 * 1024);
                                const usedMb = usedBytes / (1024 * 1024);
                                const usagePct = Math.min(100, Math.round((usedGb / currentTotalCapGb) * 100));
                                const formattedUsed = usedBytes <= 0
                                  ? '0,0 MB'
                                  : usedGb < 1.0 
                                    ? `${usedMb.toFixed(1).replace('.', ',')} MB` 
                                    : `${usedGb.toFixed(2).replace('.', ',')} GB`;
                                const formattedPct = usedBytes > 0 && usagePct < 1 ? '< 1%' : `${usagePct}%`;

                                return (
                                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                      <span style={{ fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <HardDrive size={15} color="#34a853" /> Aktuelle Speicherbelegung:
                                      </span>
                                      <span style={{ fontWeight: 700, color: usagePct > 80 ? '#dc2626' : '#16a34a' }}>
                                        {formattedUsed} von {currentTotalCapGb} GB belegt ({formattedPct})
                                      </span>
                                    </div>
                                    <div style={{ background: '#e2e8f0', borderRadius: '6px', height: '6px', overflow: 'hidden', width: '100%' }}>
                                      <div style={{
                                        height: '100%',
                                        width: `${usedBytes > 0 ? Math.max(5, (usedGb / currentTotalCapGb) * 100) : 0}%`,
                                        background: usagePct > 80 ? '#ef4444' : 'linear-gradient(90deg, #34a853 0%, #10b981 100%)',
                                        borderRadius: '6px',
                                        transition: 'width 0.3s ease'
                                      }} />
                                    </div>
                                  </div>
                                );
                              })()}

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: '12px' }}>
                                {(masterPricing.storageTiers || DEFAULT_STORAGE_TIERS).map((tier: StorageTier) => {
                                  const iconMapping: Record<number, any> = {
                                    0: HardDrive,
                                    5: Cloud,
                                    10: Zap,
                                    20: Rocket,
                                    25: Rocket,
                                    50: Crown,
                                    100: Database,
                                    250: Sparkles
                                  };
                                  const IconCmp = iconMapping[tier.gb] || Sparkles;
                                  const isSel = selectedStorageAddonGb === tier.gb;
                                  const activeBookedGb = Number(currentSchoolProfile?.storage_addon_gb || 0);
                                  const isCurrentlyActive = activeBookedGb === tier.gb;

                                  const baseGb = 1.0;
                                  const tierCapGb = baseGb + tier.gb;
                                  const usedBytes = getEffectiveStorageUsedBytes(currentSchoolProfile);
                                  const usedGb = usedBytes / (1024 * 1024 * 1024);
                                  const isDowngradeBlocked = usedGb > tierCapGb;

                                  return (
                                    <div
                                      key={tier.gb}
                                      onClick={() => {
                                        if (isDowngradeBlocked) {
                                          alert(`⚠️ Downgrade nicht möglich: Deine Musikschule belegt aktuell ${usedGb.toFixed(2).replace('.', ',')} GB. Bitte lösche zuerst ${(usedGb - tierCapGb).toFixed(2).replace('.', ',')} GB an Aufnahmen im Audio-Tresor, um auf ${tier.label} zu wechseln.`);
                                          return;
                                        }
                                        setSelectedStorageAddonGb(tier.gb);
                                        setSelectedStorageAddonFee(tier.price);
                                      }}
                                      style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        padding: '16px 14px',
                                        borderRadius: '16px',
                                        border: '2px solid',
                                        borderColor: isSel ? '#34a853' : isCurrentlyActive ? '#a7f3d0' : isDowngradeBlocked ? '#f1f5f9' : '#e2e8f0',
                                        background: isSel ? '#f0fdf4' : isCurrentlyActive ? '#fafffd' : isDowngradeBlocked ? '#f8fafc' : '#ffffff',
                                        cursor: isDowngradeBlocked ? 'not-allowed' : 'pointer',
                                        textAlign: 'center',
                                        transition: 'all 0.2s',
                                        opacity: isDowngradeBlocked ? 0.6 : 1,
                                        boxShadow: isSel ? '0 6px 16px rgba(52, 168, 83, 0.12)' : 'none',
                                        position: 'relative'
                                      }}
                                    >
                                      {isCurrentlyActive && (
                                        <span style={{
                                          position: 'absolute',
                                          top: '-9px',
                                          left: '50%',
                                          transform: 'translateX(-50%)',
                                          background: '#34a853',
                                          color: '#ffffff',
                                          fontSize: '0.58rem',
                                          fontWeight: 900,
                                          padding: '2px 8px',
                                          borderRadius: '999px',
                                          letterSpacing: '0.04em',
                                          textTransform: 'uppercase'
                                        }}>
                                          Aktiv
                                        </span>
                                      )}

                                      <div>
                                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                                          <div style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '10px',
                                            background: isSel ? '#dcfce7' : '#f1f5f9',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                          }}>
                                            <IconCmp size={18} color={isSel ? '#166534' : '#64748b'} />
                                          </div>
                                        </div>
                                        <div style={{ fontWeight: 900, fontSize: '0.92rem', color: isSel ? '#166534' : '#1e293b' }}>{tier.label}</div>
                                        <div style={{ fontSize: '0.66rem', color: isSel ? '#15803d' : '#64748b', fontWeight: 600, marginTop: '2px' }}>{tier.sublabel}</div>
                                      </div>
                                      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '10px', fontSize: '0.78rem', fontWeight: 800, color: isSel ? '#34a853' : '#0f172a' }}>
                                        {tier.desc}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Security & DSGVO Compliance Guarantee Infobox */}
                              <div style={{
                                background: '#f8fafc',
                                border: '1.5px solid #e2e8f0',
                                borderRadius: '18px',
                                padding: '16px 18px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                fontSize: '0.74rem',
                                color: '#475569'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 800 }}>
                                    <ShieldCheck size={17} color="#34a853" />
                                    <span>DSGVO- &amp; Sicherheitsstandards für alle Audio-Aufnahmen</span>
                                  </div>
                                  <span style={{ fontSize: '0.66rem', background: '#e6f4ea', color: '#166534', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                                    🔒 100% Deutscher Serverstandort
                                  </span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', fontSize: '0.7rem', lineHeight: '1.4' }}>
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                    <span style={{ color: '#34a853', fontWeight: 900, marginTop: '-1px' }}>✓</span>
                                    <span><strong>ISO 27001 zertifiziert:</strong> Dedizierte Server in Falkenstein &amp; Nürnberg (Hetzner Deutschland), kein US-Drittlandstransfer.</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                    <span style={{ color: '#34a853', fontWeight: 900, marginTop: '-1px' }}>✓</span>
                                    <span><strong>AES-256 Verschlüsselung:</strong> Alle Tonspuren und Loop-Mixe im Ruhezustand (At-Rest) verschlüsselt.</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                    <span style={{ color: '#34a853', fontWeight: 900, marginTop: '-1px' }}>✓</span>
                                    <span><strong>Art. 17 DSGVO Sofort-Löschung:</strong> Physisches, unwiderrufliches Vernichten gelöschter Aufnahmen.</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                    <span style={{ color: '#34a853', fontWeight: 900, marginTop: '-1px' }}>✓</span>
                                    <span><strong>Tägliche Sicherheits-Backups:</strong> Georedundante Snapshots für maximalen Schutz und Ausfallsicherheit.</span>
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                                <button 
                                  onClick={() => setCheckoutStep(2)}
                                  style={{
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    border: '1.5px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#475569',
                                    fontSize: '0.8rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <span>⇠</span> Zurück
                                </button>
                                <button 
                                  onClick={() => setCheckoutStep(4)}
                                  style={{
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: '#34a853',
                                    color: '#ffffff',
                                    fontSize: '0.8rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(52, 168, 83, 0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  Weiter zur Rechnungsadresse <span>➔</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {checkoutStep === 4 && (
                            <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                              <div>
                                <span style={{ fontSize: '0.62rem', background: '#e6f4ea', color: '#34a853', padding: '4px 10px', borderRadius: '100px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schritt 4 von 5</span>
                                <h4 style={{ margin: '8px 0 4px 0', fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', fontFamily: 'Urbanist' }}>Rechnungsanschrift &amp; Zahlungsweg</h4>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: '1.4' }}>
                                  Prüfe die Rechnungsdaten für die monatliche Hosting-Pauschale und den gewählten Zahlungsweg der Schüler-Aktivierungen.
                                </p>
                              </div>

                              {/* Section 1: Music School Billing Address (Always active for the school hosting fee) */}
                              <div style={{
                                background: '#ffffff',
                                border: '1.5px solid #e2e8f0',
                                borderRadius: '16px',
                                padding: '18px 20px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 800, fontSize: '0.86rem' }}>
                                  <School size={17} color="#34a853" />
                                  <span>Rechnungsanschrift der Musikschule (für monatliche Hosting-Pauschale)</span>
                                </div>

                                <div style={{
                                  background: '#f8fafc',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '12px',
                                  padding: '12px 16px',
                                  fontSize: '0.82rem',
                                  color: '#334155',
                                  lineHeight: 1.5,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '2px'
                                }}>
                                  <strong style={{ color: '#0f172a' }}>{schoolName || 'Patrick Huber Musikschule'}</strong>
                                  <span>{schoolStreet || 'Karl-Fürstenberg-Str.'} {schoolHouseNumber || '59'}</span>
                                  <span>{schoolZipCode || '79618'} {schoolCity || 'Rheinfelden'} • Deutschland</span>
                                </div>

                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>
                                  <input
                                    type="checkbox"
                                    checked={hasCustomBillingAddress}
                                    onChange={(e) => setHasCustomBillingAddress(e.target.checked)}
                                    style={{ width: '15px', height: '15px', accentColor: '#34a853' }}
                                  />
                                  Abweichende Rechnungsanschrift hinterlegen (z.B. Träger / Stadtkasse / Förderverein)
                                </label>

                                {hasCustomBillingAddress && (
                                  <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '12px',
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '14px',
                                    padding: '16px',
                                    marginTop: '4px'
                                  }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
                                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569' }}>Name / Institution des Rechnungsempfängers:</span>
                                      <input
                                        type="text"
                                        placeholder="z.B. Stadtkasse / Musikschul-Trägerverein"
                                        value={customBillingName}
                                        onChange={(e) => setCustomBillingName(e.target.value)}
                                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.76rem', background: '#fff' }}
                                      />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
                                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569' }}>Straße &amp; Hausnummer:</span>
                                      <input
                                        type="text"
                                        placeholder="Rathausplatz 1"
                                        value={customBillingStreet}
                                        onChange={(e) => setCustomBillingStreet(e.target.value)}
                                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.76rem', background: '#fff' }}
                                      />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569' }}>PLZ:</span>
                                      <input
                                        type="text"
                                        placeholder="79618"
                                        value={customBillingZip}
                                        onChange={(e) => setCustomBillingZip(e.target.value)}
                                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.76rem', background: '#fff' }}
                                      />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569' }}>Ort:</span>
                                      <input
                                        type="text"
                                        placeholder="Rheinfelden"
                                        value={customBillingCity}
                                        onChange={(e) => setCustomBillingCity(e.target.value)}
                                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.76rem', background: '#fff' }}
                                      />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
                                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569' }}>E-Mail-Adresse für Rechnungsversand:</span>
                                      <input
                                        type="email"
                                        placeholder="rechnung@stadtkasse.de"
                                        value={customBillingEmail}
                                        onChange={(e) => setCustomBillingEmail(e.target.value)}
                                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.76rem', background: '#fff' }}
                                      />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569' }}>
                                          Leitweg-ID / Kämmerei-Referenz (für E-Rechnung / XRechnung):
                                        </span>
                                        <span style={{ fontSize: '0.64rem', color: '#16a34a', fontWeight: 700 }}>Optional (für städtische/öffentliche Träger)</span>
                                      </div>
                                      <input
                                        type="text"
                                        placeholder="z.B. 08123456-12345-67"
                                        value={effectiveLeitwegId}
                                        onChange={(e) => handleLeitwegChange(e.target.value)}
                                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.76rem', background: '#fff', fontFamily: 'monospace' }}
                                      />
                                      <span style={{ fontSize: '0.62rem', color: '#64748b', lineHeight: 1.4 }}>
                                        Wird im EN 16931 XML-Datensatz (XRechnung 2.2 / ZUGFeRD) als BuyerReference für städtische Kämmereien hinterlegt.
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Section 2: Student Activation Payment Method */}
                              {billingPayer === 'school' ? (
                                <div style={{
                                  background: '#f0fdf4',
                                  border: '1.5px solid #86efac',
                                  borderRadius: '16px',
                                  padding: '16px 20px',
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '12px'
                                }}>
                                  <div style={{ background: '#dcfce7', padding: '6px', borderRadius: '8px', color: '#15803d', marginTop: '2px' }}>
                                    <Info size={18} />
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: '#166534', lineHeight: 1.5 }}>
                                    <strong style={{ display: 'block', fontSize: '0.86rem', marginBottom: '2px', color: '#14532d' }}>
                                      Schüler-Aktivierungen: Musikschule als Sammelzahler
                                    </strong>
                                    Die Musikschule übernimmt alle Aktivierungsgebühren der Schüler. Die Abrechnung erfolgt gebündelt und transparent auf der monatlichen Musikschul-Sammelrechnung.
                                  </div>
                                </div>
                              ) : (
                                <div style={{
                                  background: '#f0fdf4',
                                  border: '1.5px solid #86efac',
                                  borderRadius: '16px',
                                  padding: '18px 20px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '10px'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ background: '#dcfce7', padding: '6px', borderRadius: '8px', color: '#15803d' }}>
                                      <CreditCard size={18} />
                                    </div>
                                    <div>
                                      <strong style={{ fontSize: '0.88rem', color: '#14532d', display: 'block' }}>
                                        Schüler-Aktivierungen: Direktabrechnung mit Eltern aktiv
                                      </strong>
                                      <span style={{ fontSize: '0.76rem', color: '#166534' }}>
                                        Die Musikschule ist zu 100% von Schüler-Aktivierungskosten und Inkassoaufwand entlastet.
                                      </span>
                                    </div>
                                  </div>
                                  <div style={{
                                    background: '#ffffff',
                                    border: '1px solid #bbf7d0',
                                    borderRadius: '12px',
                                    padding: '10px 14px',
                                    fontSize: '0.74rem',
                                    color: '#15803d',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontWeight: 650
                                  }}>
                                    <ShieldCheck size={16} color="#15803d" />
                                    <span>DSGVO-Format CG-[STUDENT_HASH_8]-[YYMM] • Eltern zahlen den Beitrag (0,49 € / Mo.) dynamisch anteilig nur für die Restmonate des Schuljahres (September–August).</span>
                                  </div>
                                </div>
                              )}

                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                                <button 
                                  onClick={() => setCheckoutStep(3)}
                                  style={{
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    border: '1.5px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#475569',
                                    fontSize: '0.8rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <span>⇠</span> Zurück
                                </button>
                                <button 
                                  onClick={() => setCheckoutStep(5)}
                                  style={{
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: '#34a853',
                                    color: '#ffffff',
                                    fontSize: '0.8rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(52, 168, 83, 0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  Weiter zur Zusammenfassung <span>➔</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {checkoutStep === 5 && (() => {
                            const effectiveContractStartDateStr = isBillingBooked
                              ? contractStartDate
                              : (simulatedToday ? simulatedToday + 'T12:00:00' : new Date().toISOString());

                            const getRemainingMonths = () => {
                              const refDate = effectiveContractStartDateStr ? new Date(effectiveContractStartDateStr) : new Date();
                              const currentMonth = refDate.getMonth();
                              return currentMonth <= 7 ? (8 - currentMonth) : (20 - currentMonth);
                            };
                            const remainingMonths = getRemainingMonths();

                            // Calculations for Invoices A & B
                            const selectedModulesCount = (hasCampusSub ? 1 : 0) + (hasGroovelabSub ? 1 : 0);
                            const baseModuleCost = (hasCampusSub && hasGroovelabSub) ? masterRates.kombi : ((hasCampusSub ? masterRates.campus : 0) + (hasGroovelabSub ? masterRates.groovelab : 0));
                            
                            // Passive student profiles (total students - active students)
                            const activeStudents = students.filter((s: any) => s.isCampusActive || s.is_campus_active).length;
                            const passiveStudents = Math.max(0, students.length - activeStudents);

                            // Invoice A: Fixkosten
                            // Pure management (admin/secretary) is 100% free / inclusive in base hosting.
                            // Only pure teachers / non-exempt double roles are billed at 0,49 € / Mo.
                            const teacherCost = billableTeachersCount * effectiveSchoolRates.priceTeacher;
                            const passiveStudentCost = (billingPayer === 'student' && studentBillingOption === 'student_partial')
                              ? (students.length * 0.09)
                              : (passiveStudents * 0.09);
                            const storageAddonCost = selectedStorageAddonGb > 0 ? (selectedStorageAddonFee || Number(currentSchoolProfile?.storage_addon_monthly_fee || 0)) : 0;
                            const totalInvoiceA_monthly = baseModuleCost + teacherCost + passiveStudentCost + storageAddonCost;
                            const totalInvoiceA_restYear = totalInvoiceA_monthly * remainingMonths;

                            // Invoice B: Variable active student profiles (from school's perspective)
                            const isSchoolOneTime = billingPayer === 'school' && (studentBillingOption === 'option3_2' || studentBillingOption === 'option3_3');
                            const schoolOneTimeDiscount = studentBillingOption === 'option3_3' ? 20 : 10;
                            const schoolOneTimeCount = studentBillingOption === 'option3_3' ? students.length : activeStudents;
                            const schoolOneTimeSinglePrice = getDynamicAnnualPrice(effectiveContractStartDateStr, schoolOneTimeDiscount);
                            const schoolOneTimeTotal = schoolOneTimeCount * schoolOneTimeSinglePrice;

                            const totalInvoiceB_monthly = (billingPayer === 'school' && studentBillingOption === 'option2') ? (activeStudents * masterRates.student) : 0;
                            const totalInvoiceB_restYear = isSchoolOneTime ? schoolOneTimeTotal : (totalInvoiceB_monthly * remainingMonths);

                            const handleApplyCoupon = () => {
                              if (couponCode.trim().toLowerCase() === 'groove20') {
                                setIsCouponApplied(true);
                                setCouponDiscount(20); // 20% off
                              } else {
                                alert("Ungültiger Gutscheincode");
                              }
                            };

                            const finalInvoiceA_monthly = isCouponApplied ? (totalInvoiceA_monthly * (1 - couponDiscount / 100)) : totalInvoiceA_monthly;
                            const finalInvoiceA_restYear = isCouponApplied ? (totalInvoiceA_restYear * (1 - couponDiscount / 100)) : totalInvoiceA_restYear;

                            return (
                              <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div>
                                  <span style={{ fontSize: '0.62rem', background: '#e6f4ea', color: '#34a853', padding: '4px 10px', borderRadius: '100px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schritt 5 von 5</span>
                                  <h4 style={{ margin: '8px 0 4px 0', fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', fontFamily: 'Urbanist' }}>Bestätige deine Buchung</h4>
                                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: '1.4' }}>
                                    Die Abrechnung wird aus Transparenzgründen in zwei separate Ströme aufgeteilt. Bitte überprüfe die beiden Rechnungsvorschauen.
                                  </p>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                  {/* Invoice A Block */}
                                  <div style={{
                                    border: '1.5px solid #34a853',
                                    borderRadius: '16px',
                                    background: '#e6f4ea',
                                    padding: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px'
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e6f4ea', paddingBottom: '6px' }}>
                                      <strong style={{ fontSize: '0.78rem', color: '#34a853' }}>RECHNUNG A: System &amp; Infrastruktur (Fixkosten)</strong>
                                      <span style={{ fontSize: '0.62rem', color: '#34a853', background: '#e6f4ea', padding: '2px 8px', borderRadius: '100px', fontWeight: 700 }}>14 Tage Zahlungsziel</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.7rem', color: '#374151' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Software-Bereitstellung (Grundgebühr):</span>
                                        <strong>Kostenlos</strong>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Server- &amp; Cloud-Infrastruktur ({[hasCampusSub && 'Campus', hasGroovelabSub && 'GrooveLab'].filter(Boolean).join(' + ')}):</span>
                                        <strong>{baseModuleCost.toFixed(2).replace('.', ',')} € / Mo.</strong>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Service- &amp; Administrationspauschale:</span>
                                        <strong>
                                          {billableTeachersCount > 0 
                                            ? `${teacherCost.toFixed(2).replace('.', ',')} € / Mo. (${billableTeachersCount} Lehrkräfte × ${effectiveSchoolRates.priceTeacher.toFixed(2).replace('.', ',')} € • Schulleitung inklusive)`
                                            : '0,00 € (0 Lehrkräfte aktiv • Schulleitung inklusive)'}
                                        </strong>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Cloud-Datenbank &amp; Support (Schüler-Datenbankprofile):</span>
                                        <strong>{(passiveStudentCost).toFixed(2).replace('.', ',')} € / Mo.</strong>
                                      </div>
                                      {storageAddonCost > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534', fontWeight: 700 }}>
                                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <HardDrive size={13} color="#166534" />
                                            <span>Audio-Tresor Cloud-Speicher (+{selectedStorageAddonGb} GB):</span>
                                          </span>
                                          <strong>{storageAddonCost.toFixed(2).replace('.', ',')} € / Mo.</strong>
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ borderTop: '1px dotted #34a853', paddingTop: '8px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#34a853' }}>
                                      <span>Monatlicher Betrag (Rechnung A):</span>
                                      <strong>{finalInvoiceA_monthly.toFixed(2).replace('.', ',')} € / Mo.</strong>
                                    </div>
                                    {hasCustomBillingAddress && billingPayer !== 'student' && (
                                      <div style={{ fontSize: '0.62rem', color: '#34a853', borderTop: '1px solid #e6f4ea', paddingTop: '6px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <School size={12} />
                                        <span>Rechnungsanschrift: {customBillingName}, {customBillingStreet}, {customBillingZip} {customBillingCity}{effectiveLeitwegId ? ` • Leitweg-ID: ${effectiveLeitwegId}` : ''}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Invoice B Block */}
                                  <div style={{
                                    border: '1.5px solid #3b82f6',
                                    borderRadius: '16px',
                                    background: '#eff6ff',
                                    padding: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px'
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #dbeafe', paddingBottom: '6px' }}>
                                      <strong style={{ fontSize: '0.78rem', color: '#1d4ed8' }}>RECHNUNG B: Schüler-Aktivierungen</strong>
                                      <span style={{ fontSize: '0.62rem', color: '#1d4ed8', background: '#dbeafe', padding: '2px 8px', borderRadius: '100px', fontWeight: 700 }}>
                                        {billingPayer === 'student' ? 'Zahlung direkt durch Eltern' : '14 Tage Zahlungsziel an Musikschule'}
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.7rem', color: '#374151' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        {isSchoolOneTime ? (
                                          <>
                                            <span>
                                              {studentBillingOption === 'option3_3' ? `Komplett-Aktivierung aller Schüler (${schoolOneTimeCount} Profile):` : `Aktivierte Schülerprofile (${schoolOneTimeCount} Aktivierungen):`}
                                            </span>
                                            <strong>{schoolOneTimeSinglePrice.toFixed(2).replace('.', ',')} € / Schüler (Jahresbeitrag)</strong>
                                          </>
                                        ) : (
                                          <>
                                            <span>Aktive Schülerprofile ({activeStudents} aktivierte Aktivierungen):</span>
                                            <strong>
                                              {billingPayer === 'student' 
                                                ? `${customUmlageAmount.toFixed(2).replace('.', ',')} € / Mo. (Dynamischer Pro-Rata-Jahresbeitrag)` 
                                                : `${effectiveSchoolRates.priceStudent.toFixed(2).replace('.', ',')} € / Schüler / Mo.`}
                                            </strong>
                                          </>
                                        )}
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Kostenträger / Abrechnungsweg:</span>
                                        <strong>
                                          {billingPayer === 'student' 
                                            ? 'Direktüberweisung der Eltern an Campus-Groovelab' 
                                            : studentBillingOption === 'option2'
                                              ? 'Musikschule (Variable Monatsabrechnung)'
                                              : studentBillingOption === 'option3_2'
                                                ? 'Musikschule (Monatsrechnung für Jahresbeiträge)'
                                                : 'Musikschule (Einmalige Jahresrechnung Komplett)'}
                                        </strong>
                                      </div>
                                    </div>
                                    <div style={{ borderTop: '1px dotted #3b82f6', paddingTop: '8px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#1d4ed8' }}>
                                      <span>Kosten für die Musikschule (Rechnung B):</span>
                                      <strong>
                                        {isSchoolOneTime 
                                          ? `Einmalig ${schoolOneTimeTotal.toFixed(2).replace('.', ',')} €` 
                                          : `${totalInvoiceB_monthly.toFixed(2).replace('.', ',')} € / Mo.`}
                                      </strong>
                                    </div>
                                    
                                    {billingPayer === 'student' ? (
                                      <div style={{
                                        background: '#dbeafe',
                                        color: '#1e40af',
                                        fontSize: '0.65rem',
                                        padding: '8px 10px',
                                        borderRadius: '8px',
                                        fontWeight: 700,
                                        marginTop: '4px',
                                        lineHeight: '1.35'
                                      }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                          <Sparkles size={14} color="#1d4ed8" style={{ marginTop: '2px', flexShrink: 0 }} />
                                          <span><strong>Dynamischer Pro-Rata-Jahresbeitrag aktiv:</strong> Eltern zahlen den Beitrag (0,49 € / Mo.) anteilig nur für die verbleibenden Monate bis zum Schuljahresende im August (max. {(customUmlageAmount * 12).toFixed(2).replace('.', ',')} € bei 12 Monaten; z. B. nur {(customUmlageAmount * 7).toFixed(2).replace('.', ',')} € bei Beitritt im Februar). Die Musikschule hat dadurch <strong>0,00 € Kosten</strong> und keinen Inkassoaufwand.</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        {hasCustomActivationBillingAddress && (
                                          <div style={{ fontSize: '0.62rem', color: '#1d4ed8', borderTop: '1px solid #bfdbfe', paddingTop: '6px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <School size={12} />
                                            <span>Rechnungsanschrift für Aktivierungen: {customActivationBillingName}, {customActivationBillingStreet}, {customActivationBillingZip} {customActivationBillingCity}</span>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Collapsible Coupon Code Field */}
                                <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                                  <button
                                    onClick={() => setShowCouponInput(!showCouponInput)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#3b82f6',
                                      fontSize: '0.74rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: 0
                                    }}
                                  >
                                    <span>{showCouponInput ? '▼' : '▶'}</span> Haben Sie einen Gutscheincode?
                                  </button>
                                  
                                  {showCouponInput && (
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                      <input
                                        type="text"
                                        placeholder="z.B. GROOVE20"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value)}
                                        style={{
                                          padding: '6px 12px',
                                          borderRadius: '8px',
                                          border: '1px solid #cbd5e1',
                                          fontSize: '0.74rem',
                                          textTransform: 'uppercase'
                                        }}
                                      />
                                      <button
                                        onClick={handleApplyCoupon}
                                        style={{
                                          padding: '6px 12px',
                                          borderRadius: '8px',
                                          border: 'none',
                                          background: '#3b82f6',
                                          color: '#ffffff',
                                          fontSize: '0.74rem',
                                          fontWeight: 800,
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Einlösen
                                      </button>
                                    </div>
                                  )}
                                  
                                  {isCouponApplied && (
                                    <div style={{ color: '#34a853', fontSize: '0.7rem', fontWeight: 700, marginTop: '6px' }}>
                                      ✓ Gutscheincode active: {couponDiscount}% Rabatt auf Rechnung A (System &amp; Infrastruktur) angewendet!
                                    </div>
                                  )}
                                </div>

                                {/* Contract Start & Trial Phase Legal Notice */}
                                <div style={{
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '12px',
                                  padding: '12px 14px',
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '10px',
                                  fontSize: '0.72rem',
                                  color: '#475569',
                                  lineHeight: 1.45
                                }}>
                                  <Info size={16} color="#34a853" style={{ marginTop: '2px', flexShrink: 0 }} />
                                  <div>
                                    <strong style={{ color: '#1e293b', display: 'block', marginBottom: '2px' }}>
                                      Vertragsbeginn &amp; Testphasen-Abschluss:
                                    </strong>
                                    Mit dem Klick auf <em>„Zahlungspflichtig buchen &amp; freischalten“</em> beendest du deine unverbindliche 30-Tage-Testphase und wandelst sie in einen regulären Produktivvertrag für deine Musikschule um. Die monatliche Bereitstellung (Rechnung A) startet ab dem heutigen Tag mit 14 Tagen Zahlungsziel zum Monatsende.
                                  </div>
                                </div>

                                {/* Checkbox GTC & Privacy */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer' }}>
                                    <input 
                                      type="checkbox"
                                      checked={agreedToTerms}
                                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                                      style={{ width: '16px', height: '16px', accentColor: '#34a853', marginTop: '2px', cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: '0.74rem', color: '#475569', lineHeight: '1.4' }}>
                                      Ich akzeptiere die <strong>AGB</strong> und die <strong>Datenschutzerklärung für Musikschulen</strong>.
                                    </span>
                                  </label>

                                  <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer' }}>
                                    <input 
                                      type="checkbox"
                                      checked={agreedToSepa}
                                      onChange={(e) => setAgreedToSepa(e.target.checked)}
                                      style={{ width: '16px', height: '16px', accentColor: '#34a853', marginTop: '2px', cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: '0.74rem', color: '#475569', lineHeight: '1.4' }}>
                                      Hiermit bestätige ich die kostenpflichtige Buchung per Rechnung (Zahlungsziel: 14 Tage). Ich stimme zu, dass Rechnungen an die angegebene Rechnungsadresse gesendet werden.
                                    </span>
                                  </label>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                                  <button 
                                    onClick={() => setCheckoutStep(4)}
                                    style={{
                                      padding: '12px 24px',
                                      borderRadius: '12px',
                                      border: '1.5px solid #cbd5e1',
                                      background: '#ffffff',
                                      color: '#475569',
                                      fontSize: '0.8rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    <span>⇠</span> Zurück
                                  </button>
                                  <button 
                                    onClick={async () => {
                                      if (!agreedToTerms) {
                                        alert("Bitte stimme den AGB und den Datenschutzbestimmungen zu.");
                                        return;
                                      }
                                      if (!agreedToSepa) {
                                        alert("Bitte bestätige die kostenpflichtige Buchung.");
                                        return;
                                      }
                                      try {
                                        const simulated = typeof window !== 'undefined' ? localStorage.getItem(`simulatedContractStartDate_${schoolId}`) : null;
                                        const todayStr = simulated || new Date().toISOString().split('T')[0];

                                        const activeSchoolAddonGb = Number(currentSchoolProfile?.storage_addon_gb || 0);
                                        const effectiveAddonGb = selectedStorageAddonGb > 0 
                                          ? selectedStorageAddonGb 
                                          : (activeSchoolAddonGb > 0 ? activeSchoolAddonGb : 0);
                                        const effectiveAddonFee = selectedStorageAddonFee > 0
                                          ? selectedStorageAddonFee
                                          : (Number(currentSchoolProfile?.storage_addon_monthly_fee || 0) || (effectiveAddonGb === 25 ? 3.99 : effectiveAddonGb === 10 ? 1.99 : effectiveAddonGb === 50 ? 6.99 : effectiveAddonGb === 100 ? 11.99 : effectiveAddonGb === 250 ? 24.99 : 0));

                                        const { data: bookingPlanData, error: bookingPlanErr } = await supabase.rpc('book_school_tariff_plan', {
                                          p_school_id: schoolId,
                                          p_has_campus: hasCampusSub,
                                          p_has_groovelab: hasGroovelabSub,
                                          p_student_billing_option: studentBillingOption,
                                          p_storage_addon_gb: effectiveAddonGb,
                                          p_storage_addon_monthly_fee: effectiveAddonFee,
                                          p_booking_type: 'SUBSCRIPTION_BOOKING',
                                          p_notes: 'Verbindlicher Abschluss der Schuljahres-Buchung'
                                        });

                                        if (bookingPlanErr) {
                                          console.warn("book_school_tariff_plan fallback check:", bookingPlanErr);
                                          // Fallback to confirm_school_subscription if migration is in flight
                                          await supabase.rpc('confirm_school_subscription', {
                                            p_school_id: schoolId,
                                            p_has_campus: hasCampusSub,
                                            p_has_groovelab: hasGroovelabSub,
                                            p_student_billing_option: studentBillingOption,
                                            p_contract_start_date: todayStr,
                                            p_storage_addon_gb: effectiveAddonGb,
                                            p_storage_addon_monthly_fee: effectiveAddonFee
                                          });
                                        }

                                        if (hasCustomBillingAddress || effectiveLeitwegId) {
                                          try {
                                            await supabase.from('schools').update({
                                              ...(effectiveLeitwegId ? { leitweg_id: effectiveLeitwegId.trim() } : {}),
                                              ...(hasCustomBillingAddress ? {
                                                legal_name: customBillingName.trim() || null,
                                                street: customBillingStreet.trim() || null,
                                                zip_code: customBillingZip.trim() || null,
                                                city: customBillingCity.trim() || null,
                                                billing_email: customBillingEmail.trim() || null
                                              } : {})
                                            }).eq('id', schoolId);
                                          } catch (dbErr) {
                                            console.warn('[SecretaryLicensesView] Failed to persist billing address to schools:', dbErr);
                                          }
                                        }

                                        setIsBillingBooked(true);
                                        setIsSchoolTrial(false);
                                        setSchoolStatus('active');
                                        setCurrentSchoolProfile((prev: any) => prev ? ({
                                          ...prev,
                                          leitweg_id: effectiveLeitwegId.trim() || prev.leitweg_id,
                                          is_billing_booked: true,
                                          is_trial: false,
                                          status: 'active',
                                          has_campus_subscription: hasCampusSub,
                                          has_groovelab_subscription: hasGroovelabSub,
                                          student_billing_option: studentBillingOption,
                                          contract_start_date: todayStr,
                                          storage_addon_gb: effectiveAddonGb,
                                          storage_addon_monthly_fee: effectiveAddonFee,
                                          storage_addon_status: effectiveAddonGb > 0 ? 'active' : 'none'
                                        }) : prev);

                                        if (typeof window !== 'undefined') {
                                          localStorage.setItem(`isBillingBooked_${schoolId}`, 'true');
                                          localStorage.setItem(`contractStartDate_${schoolId}`, todayStr);
                                          localStorage.setItem(`groovelab_storage_addon_gb_${schoolId}`, String(effectiveAddonGb));
                                          localStorage.setItem(`campus_storage_addon_gb_${schoolId}`, String(effectiveAddonGb));
                                          localStorage.setItem('groovelab_storage_addon_gb', String(effectiveAddonGb));
                                          localStorage.setItem('campus_storage_addon_gb', String(effectiveAddonGb));
                                          localStorage.setItem('groovelab_storage_addon_active', effectiveAddonGb > 0 ? 'true' : 'false');
                                          localStorage.setItem('campus_storage_addon_active', effectiveAddonGb > 0 ? 'true' : 'false');
                                        }
                                        await fetchDashboardData();
                                        await fetchTariffBookings();
                                        setShowSuccessModal(true);
                                      } catch (err: any) {
                                        console.error("Confirm billing booking error:", err);
                                        alert("Fehler beim Abschließen der Buchung: " + err.message);
                                      }
                                    }}
                                    disabled={!agreedToSepa || !agreedToTerms}
                                    style={{
                                      padding: '12px 24px',
                                      borderRadius: '12px',
                                      border: 'none',
                                      background: (!agreedToSepa || !agreedToTerms) ? '#cbd5e1' : '#34a853',
                                      color: '#ffffff',
                                      fontSize: '0.8rem',
                                      fontWeight: 800,
                                      cursor: (!agreedToSepa || !agreedToTerms) ? 'not-allowed' : 'pointer',
                                      boxShadow: (!agreedToSepa || !agreedToTerms) ? 'none' : '0 4px 12px rgba(52, 168, 83, 0.15)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    Zahlungspflichtig buchen &amp; freischalten <span>➔</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })()}

                        </div>

                        {/* Right Column: Order Summary Card */}
                        <div>
                          <div style={{
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '24px',
                            padding: '24px',
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '18px',
                            textAlign: 'left',
                            position: 'sticky',
                            top: '20px'
                          }}>
                            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>ABRECHNUNG &amp; TARIFE</span>
                                <h4 style={{ margin: '2px 0 0 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Vorschau der Buchung</h4>
                              </div>
                              <span style={{ fontSize: '0.68rem', background: '#e6f4ea', color: '#166534', padding: '4px 10px', borderRadius: '9999px', fontWeight: 700 }}>
                                Schritt {checkoutStep} von 5
                              </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.78rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                                <span><CampusGroovelabText /> Software-Bereitstellung:</span>
                                <strong style={{ color: '#34a853' }}>0,00 € (Inklusive)</strong>
                              </div>

                              {hasCampusSub && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                                  <span>Cloud- & Datenbank-Hosting: Modul Campus:</span>
                                  <strong>{effectiveSchoolRates.priceCampus.toFixed(2).replace('.', ',')} € / Mo.</strong>
                                </div>
                              )}
                              {hasGroovelabSub && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                                  <span>Cloud- & Datenbank-Hosting: Modul GrooveLab:</span>
                                  <strong>{effectiveSchoolRates.priceGroovelab.toFixed(2).replace('.', ',')} € / Mo.</strong>
                                </div>
                              )}
                              {hasCampusSub && hasGroovelabSub && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontWeight: 600 }}>
                                  <span>Kombi-Vorteilsrabatt (Infrastruktur-Bündel):</span>
                                  <span>-{(effectiveSchoolRates.priceCampus + effectiveSchoolRates.priceGroovelab - effectiveSchoolRates.priceKombi).toFixed(2).replace('.', ',')} € / Mo.</span>
                                </div>
                              )}

                              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {billableTeachersCount > 0 && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                                    <span>Service- & Administrationspauschale ({billableTeachersCount} Lehrkräfte × {effectiveSchoolRates.priceTeacher.toFixed(2).replace('.', ',')} €):</span>
                                    <strong>{(billableTeachersCount * effectiveSchoolRates.priceTeacher).toFixed(2).replace('.', ',')} € / Mo.</strong>
                                  </div>
                                )}

                                {passiveStudentsCount_global > 0 && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                                    <span>Basis-Bereitstellung ({passiveStudentsCount_global} Schüler × 0,09 €):</span>
                                    <strong>{(passiveStudentsCount_global * 0.09).toFixed(2).replace('.', ',')} € / Mo.</strong>
                                  </div>
                                )}

                                {activeStudentsCount_global > 0 && isSammelzahler && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                                    <span>Cloud- & Modul-Bereitstellung: Campus ({activeStudentsCount_global} Schüler × {effectiveSchoolRates.priceStudent.toFixed(2).replace('.', ',')} €):</span>
                                    <strong>{(activeStudentsCount_global * effectiveSchoolRates.priceStudent).toFixed(2).replace('.', ',')} € / Mo.</strong>
                                  </div>
                                )}

                                {activeGroovelabStudentsCount_global > 0 && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                                    <span>Cloud- & Modul-Bereitstellung: GrooveLab ({activeGroovelabStudentsCount_global} Schüler × {effectiveSchoolRates.priceStudent.toFixed(2).replace('.', ',')} €):</span>
                                    <strong>{(activeGroovelabStudentsCount_global * effectiveSchoolRates.priceStudent).toFixed(2).replace('.', ',')} € / Mo.</strong>
                                  </div>
                                )}

                                {/* Tresor Storage Add-on Line Item */}
                                {(() => {
                                  const addonGb = selectedStorageAddonGb;
                                  const addonFee = selectedStorageAddonFee;
                                  const baseGb = 1.0;
                                  const totalCapGb = baseGb + addonGb;
                                  const usedBytes = getEffectiveStorageUsedBytes(currentSchoolProfile);
                                  const usedGb = usedBytes / (1024 * 1024 * 1024);
                                  const usedMb = usedBytes / (1024 * 1024);
                                  const freeGb = Math.max(0, totalCapGb - usedGb);
                                  const usagePct = Math.min(100, Math.round((usedGb / totalCapGb) * 100));
                                  const formattedUsed = usedBytes <= 0
                                    ? '0,0 MB'
                                    : usedGb < 1.0 
                                      ? `${usedMb.toFixed(1).replace('.', ',')} MB` 
                                      : `${usedGb.toFixed(2).replace('.', ',')} GB`;
                                  const formattedPct = usedBytes > 0 && usagePct < 1 ? '< 1%' : `${usagePct}%`;

                                  return (
                                    <div style={{ borderTop: '1.5px dashed #e2e8f0', paddingTop: '10px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontSize: '0.74rem' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                          <HardDrive size={13} color="#34a853" />
                                          <span>Audio-Tresor Speicher ({addonGb > 0 ? `+${addonGb} GB` : '1 GB Basis'}):</span>
                                        </span>
                                        <strong style={{ color: addonGb > 0 ? '#0f172a' : '#15803d' }}>
                                          {addonGb > 0 ? `${addonFee.toFixed(2).replace('.', ',')} € / Mo.` : 'Inklusive (0,00 €)'}
                                        </strong>
                                      </div>

                                      {/* Mini Progress Bar */}
                                      <div style={{ background: '#f1f5f9', borderRadius: '6px', height: '6px', overflow: 'hidden', width: '100%', marginTop: '2px' }}>
                                        <div style={{
                                          height: '100%',
                                          width: `${usedBytes > 0 ? Math.max(5, (usedGb / totalCapGb) * 100) : 0}%`,
                                          background: usagePct > 80 ? '#ef4444' : 'linear-gradient(90deg, #34a853 0%, #10b981 100%)',
                                          borderRadius: '6px',
                                          transition: 'width 0.3s ease'
                                        }} />
                                      </div>

                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: '#64748b', fontWeight: 600 }}>
                                        <span>{formattedUsed} von {totalCapGb} GB belegt ({formattedPct})</span>
                                        <span style={{ color: usagePct > 80 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>{freeGb.toFixed(2).replace('.', ',')} GB frei</span>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Total Rate & VAT Box */}
                            <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <span style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>Gesamtrate:</span>
                                <div style={{ textAlign: 'right' }}>
                                  <span style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.03em' }}>
                                    {(baseB2B_global).toFixed(2).replace('.', ',')} € / Mo.
                                  </span>
                                </div>
                              </div>
                              <span style={{ fontSize: '0.64rem', color: '#64748b', textAlign: 'right', fontWeight: 500 }}>
                                Umsatzsteuerbefreit gemäß § 19 UStG
                              </span>

                              <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '12px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.68rem', color: '#64748b', marginTop: '6px' }}>
                                <Lock size={13} color="#94a3b8" />
                                <span>Abrechnung erfolgt am Monatsende. Rechnungen jederzeit einsehbar.</span>
                              </div>
                            </div>
                          </div>
                        </div>

                    {/* Success Modal Overlay */}
                    {showSuccessModal && (
                      <div 
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="license-booking-success-title"
                        style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(15, 23, 42, 0.6)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 99999,
                        padding: '20px'
                      }}>
                        <div className="glass-panel" style={{
                          background: '#ffffff',
                          border: '2px solid #34a853',
                          borderRadius: '24px',
                          padding: '40px 32px',
                          maxWidth: '480px',
                          width: '100%',
                          textAlign: 'center',
                          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '20px'
                        }}>
                          <div style={{
                            width: '72px',
                            height: '72px',
                            borderRadius: '50%',
                            background: '#e6f4ea',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#34a853',
                            fontSize: '2.5rem',
                            fontWeight: 900,
                            boxShadow: '0 10px 20px rgba(52, 168, 83, 0.15)'
                          }}>
                            ✓
                          </div>
                          <div>
                            <h3 id="license-booking-success-title" style={{ margin: '0 0 8px 0', fontSize: '1.4rem', fontWeight: 900, color: '#1e293b', fontFamily: 'Urbanist' }}>Buchung erfolgreich abgeschlossen!</h3>
                            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: '1.4' }}>
                              Dein Abonnement wurde erfolgreich eingerichtet. Die Freischaltung aller Module und die Verbuchung sind abgeschlossen.
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setShowSuccessModal(false);
                            }}
                            style={{
                              width: '100%',
                              padding: '14px 24px',
                              borderRadius: '12px',
                              border: 'none',
                              background: '#34a853',
                              color: '#ffffff',
                              fontSize: '0.86rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              boxShadow: '0 4px 12px rgba(52, 168, 83, 0.2)',
                              transition: 'all 0.2s'
                            }}
                          >
                            Zum Dashboard wechseln ➔
                          </button>
                        </div>
                      </div>
                    )}
                       </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'Inter', textAlign: 'left' }}>
                        
                        {/* Active Booking Banner */}
                        {(() => {
                          const yearInfo = getSchoolYearEndInfo(simulatedToday, schoolContractEndsAt);
                          return (
                            <div style={{
                              background: isCancelled 
                                ? 'linear-gradient(90deg, #fef3c7 0%, #fffbeb 100%)' 
                                : 'linear-gradient(90deg, #e6f4ea 0%, #e6f4ea 100%)',
                              border: isCancelled ? '1px solid #fde68a' : '1px solid #e6f4ea',
                              borderRadius: '20px',
                              padding: '20px 24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '16px',
                              boxShadow: '0 4px 16px rgba(52, 168, 83, 0.04)'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                                <div style={{ 
                                  background: isCancelled ? '#d97706' : '#34a853', 
                                  color: '#ffffff', 
                                  width: '38px', 
                                  height: '38px', 
                                  borderRadius: '50%', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  fontSize: '1.25rem', 
                                  fontWeight: 900 
                                }}>{isCancelled ? '!' : '✓'}</div>
                                <div>
                                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: isCancelled ? '#78350f' : '#34a853', fontFamily: 'Urbanist' }}>
                                    {isCancelled 
                                      ? `Abonnement gekündigt zum ${yearInfo.formattedDate}` 
                                      : `Abrechnungssystem für das Schuljahr ${yearInfo.schoolYearLabel} aktiv`}
                                  </h4>
                                  <span style={{ fontSize: '0.74rem', color: isCancelled ? '#b45309' : '#34a853', fontWeight: 600 }}>
                                    {isCancelled 
                                      ? `Dein Zugang bleibt bis zum Ende des Schuljahres am ${yearInfo.formattedDate} voll aktiv. Es erfolgen danach keine weiteren Abbuchungen.`
                                      : 'Alle Module und gewählten Abrechnungsarten sind verbindlich eingerichtet und aktiv gebucht.'}
                                  </span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {!isCancelled ? (
                                  <button
                                    onClick={() => setShowCancelModal(true)}
                                    className="hover-scale"
                                    style={{
                                      background: '#ffffff',
                                      color: '#ef4444',
                                      border: '1px solid #fca5a5',
                                      borderRadius: '10px',
                                      padding: '8px 16px',
                                      fontSize: '0.74rem',
                                      fontWeight: 750,
                                      cursor: 'pointer',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    Abo kündigen
                                  </button>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                      onClick={() => downloadCancellationReceiptPdf({
                                        cancellationId: lastCancellationId,
                                        cancelledAt: new Date(),
                                        effectiveEndDateFormatted: yearInfo.formattedDate,
                                        schoolName: schoolName || currentSchoolProfile?.name
                                      })}
                                      className="hover-scale"
                                      style={{
                                        background: '#ffffff',
                                        color: '#b45309',
                                        border: '1px solid #fde68a',
                                        borderRadius: '10px',
                                        padding: '8px 14px',
                                        fontSize: '0.74rem',
                                        fontWeight: 750,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                      }}
                                    >
                                      📄 Kündigungsbeleg (PDF)
                                    </button>
                                    <button
                                      onClick={async () => {
                                        try {
                                          const { error: rpcErr } = await supabase.rpc('reactivate_school_subscription', {
                                            p_school_id: schoolId,
                                            p_actor_id: (currentSchoolProfile as any)?.user_id || null
                                          });
                                          if (rpcErr) {
                                            const { error: directErr } = await supabase
                                              .from('schools')
                                              .update({ contract_ends_at: null })
                                              .eq('id', schoolId);
                                            if (directErr) throw directErr;
                                          }

                                          setIsCancelled(false);
                                          setSchoolContractEndsAt(null);
                                          if (typeof window !== 'undefined') {
                                            localStorage.removeItem(`isCancelled_${schoolId}`);
                                          }
                                        } catch (err: any) {
                                          console.error("Reactivation error:", err);
                                          alert("Fehler beim Reaktivieren des Vertrags. Bitte versuche es erneut.");
                                        }
                                      }}
                                      className="hover-scale"
                                      style={{
                                        background: '#34a853',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '8px 16px',
                                        fontSize: '0.74rem',
                                        fontWeight: 750,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                      }}
                                    >
                                      Reaktivieren
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {(() => {
                          const activatedStudents = students.filter((s: any) => s.isCampusActive || s.isGroovelabActive || s.is_campus_active || s.is_groovelab_active);
                          const activeStudentsCount = activatedStudents.length;
                          const totalStudentsCount = students.length;
                          const activationPercentage = totalStudentsCount > 0 ? Math.round((activeStudentsCount / totalStudentsCount) * 100) : 0;
                          const debitCount = activatedStudents.filter((s: any) => s.student_billing_payment_method === 'debit').length;
                          const cashCount = activatedStudents.filter((s: any) => s.student_billing_payment_method === 'cash').length;

                          const now = simulatedToday 
                            ? (simulatedToday.includes('T') ? new Date(simulatedToday) : new Date(simulatedToday + 'T19:30:38+02:00')) 
                            : new Date();
                          const currentMonthVal = now.getMonth() + 1;
                          const currentYearVal = now.getFullYear();

                          const lastDay = new Date(currentYearVal, currentMonthVal, 0).getDate();
                          const creationTime = new Date(currentYearVal, currentMonthVal - 1, lastDay, 23, 58, 0);
                          const isInvoiceFinalized = now.getTime() >= creationTime.getTime();

                          const studentsAddedThisMonth = isInvoiceFinalized ? 0 : students.filter((s: any) => {
                            const isCurrentlyActive = s.isCampusActive || s.isGroovelabActive || s.is_campus_active || s.is_groovelab_active;
                            if (!isCurrentlyActive) return false;
                            const actDate = s.activated_at ? new Date(s.activated_at) : (s.created_at ? new Date(s.created_at) : null);
                            if (!actDate) return false;
                            return actDate.getMonth() === (currentMonthVal - 1) && actDate.getFullYear() === currentYearVal;
                          }).length;

                          const deMonthsMapLocal: Record<number, number> = {
                            9: 12, 10: 11, 11: 10, 12: 9, 1: 8, 2: 7, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1
                          };
                          const restmonate = deMonthsMapLocal[currentMonthVal] !== undefined ? deMonthsMapLocal[currentMonthVal] : 12;
                          const activationFeePerStudent = 0.40 * restmonate;
                          const currentMonthActivationsAmount = studentsAddedThisMonth * activationFeePerStudent;

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                              {/* Apple-style Segmented Control for Sub-Tab Switching */}
                              <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                marginBottom: '10px'
                              }}>
                                <div style={{
                                  background: '#f1f5f9',
                                  borderRadius: '14px',
                                  padding: '4px',
                                  display: 'inline-flex',
                                  boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)'
                                }}>
                                  <button
                                    onClick={() => setActiveBillingSubTab('overview')}
                                    style={{
                                      background: activeBillingSubTab === 'overview' ? '#ffffff' : 'transparent',
                                      border: 'none',
                                      borderRadius: '10px',
                                      padding: '8px 20px',
                                      fontSize: '0.78rem',
                                      fontWeight: activeBillingSubTab === 'overview' ? 800 : 600,
                                      color: activeBillingSubTab === 'overview' ? '#1e293b' : '#64748b',
                                      cursor: 'pointer',
                                      boxShadow: activeBillingSubTab === 'overview' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <BarChart2 size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Übersicht
                                  </button>
                                  
                                  <button
                                    onClick={() => setActiveBillingSubTab('history')}
                                    style={{
                                      background: activeBillingSubTab === 'history' ? '#ffffff' : 'transparent',
                                      border: 'none',
                                      borderRadius: '10px',
                                      padding: '8px 20px',
                                      fontSize: '0.78rem',
                                      fontWeight: activeBillingSubTab === 'history' ? 800 : 600,
                                      color: activeBillingSubTab === 'history' ? '#1e293b' : '#64748b',
                                      cursor: 'pointer',
                                      boxShadow: activeBillingSubTab === 'history' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <FileText size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Rechnungsverlauf
                                  </button>
                                  
                                  <button
                                    onClick={() => {
                                      setActiveBillingSubTab('ledger');
                                      fetchTariffBookings();
                                    }}
                                    style={{
                                      background: activeBillingSubTab === 'ledger' ? '#ffffff' : 'transparent',
                                      border: 'none',
                                      borderRadius: '10px',
                                      padding: '8px 20px',
                                      fontSize: '0.78rem',
                                      fontWeight: activeBillingSubTab === 'ledger' ? 800 : 600,
                                      color: activeBillingSubTab === 'ledger' ? '#1e293b' : '#64748b',
                                      cursor: 'pointer',
                                      boxShadow: activeBillingSubTab === 'ledger' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                                      transition: 'all 0.15s ease',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px'
                                    }}
                                  >
                                    <ScrollText size={14} style={{ verticalAlign: 'middle' }} /> Buchungsjournal &amp; Tarife
                                  </button>
                                  
                                  <button
                                    onClick={() => setActiveBillingSubTab('compliance')}
                                    style={{
                                      background: activeBillingSubTab === 'compliance' ? '#ffffff' : 'transparent',
                                      border: 'none',
                                      borderRadius: '10px',
                                      padding: '8px 20px',
                                      fontSize: '0.78rem',
                                      fontWeight: activeBillingSubTab === 'compliance' ? 800 : 600,
                                      color: activeBillingSubTab === 'compliance' ? '#15803d' : '#64748b',
                                      cursor: 'pointer',
                                      boxShadow: activeBillingSubTab === 'compliance' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                                      transition: 'all 0.15s ease',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px'
                                    }}
                                  >
                                    <ShieldCheck size={14} style={{ verticalAlign: 'middle' }} /> Recht &amp; Compliance (B2B)
                                  </button>
                                </div>
                              </div>

                              {activeBillingSubTab === 'overview' && (
                                <div style={{
                                  display: 'grid',
                                  gridTemplateColumns: '1.7fr 1.3fr',
                                  gap: '28px',
                                  width: '100%',
                                  alignItems: 'start',
                                  textAlign: 'left',
                                  marginTop: '10px'
                                }}>
                                  {/* Left Column (60%): Plan Status & Student Summary */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    
                                    {/* Apple HIG Standard: Module & Payment Status Widget */}
                                      <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                                          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Aktive Module &amp; Kosten-Übernahme</h4>
                                        </div>
                                        
                                        {/* Row 1: The 2 Main Platform Modules (Campus & GrooveLab) */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                                          {/* Campus Module */}
                                          {hasCampusSub ? (
                                            <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', padding: '14px 18px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                              <div style={{ width: '10px', height: '10px', minWidth: '10px', borderRadius: '50%', background: '#34a853', boxShadow: '0 0 0 3px rgba(52, 168, 83, 0.25)' }} />
                                              <div>
                                                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#166534' }}>Campus Modul</div>
                                                <div style={{ fontSize: '0.74rem', color: '#15803d', fontWeight: 500 }}>Stundenplan &amp; Protokoll aktiv</div>
                                              </div>
                                            </div>
                                          ) : (
                                            <div style={{
                                              background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
                                              border: '1.5px dashed #86efac',
                                              padding: '14px 18px',
                                              borderRadius: '16px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'space-between',
                                              gap: '12px',
                                              boxShadow: '0 2px 8px rgba(52, 168, 83, 0.04)'
                                            }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '10px', height: '10px', minWidth: '10px', borderRadius: '50%', background: '#cbd5e1' }} />
                                                <div>
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>Campus Modul</span>
                                                    <span style={{ fontSize: '0.62rem', background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '100px', fontWeight: 800 }}>
                                                      Kombi-Vorteil +10,00 € / Mo.
                                                    </span>
                                                  </div>
                                                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                                    Hausaufgaben, Übe-Timer &amp; Raumplaner
                                                  </div>
                                                </div>
                                              </div>
                                              <button
                                                type="button"
                                                aria-label="Campus Modul hinzubuchen"
                                                onClick={() => { setUpgradeTargetModule('campus'); setShowModuleUpgradeModal(true); }}
                                                className="hover-scale"
                                                style={{
                                                  background: '#34a853',
                                                  color: '#ffffff',
                                                  border: 'none',
                                                  borderRadius: '10px',
                                                  padding: '8px 12px',
                                                  fontSize: '0.74rem',
                                                  fontWeight: 800,
                                                  cursor: 'pointer',
                                                  whiteSpace: 'nowrap',
                                                  boxShadow: '0 2px 8px rgba(52, 168, 83, 0.25)'
                                                }}
                                              >
                                                Hinzubuchen ➔
                                              </button>
                                            </div>
                                          )}

                                          {/* GrooveLab Module */}
                                          {hasGroovelabSub ? (
                                            <div style={{ background: '#fefce8', border: '1.5px solid #fef08a', padding: '14px 18px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                              <div style={{ width: '10px', height: '10px', minWidth: '10px', borderRadius: '50%', background: '#eab308', boxShadow: '0 0 0 3px rgba(234, 179, 8, 0.25)' }} />
                                              <div>
                                                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#854d0e' }}>GrooveLab Modul</div>
                                                <div style={{ fontSize: '0.74rem', color: '#a16207', fontWeight: 500 }}>Live-Lab &amp; Bands aktiv</div>
                                              </div>
                                            </div>
                                          ) : (
                                            <div style={{
                                              background: 'linear-gradient(135deg, #fefce8 0%, #ffffff 100%)',
                                              border: '1.5px dashed #fde047',
                                              padding: '14px 18px',
                                              borderRadius: '16px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'space-between',
                                              gap: '12px',
                                              boxShadow: '0 2px 8px rgba(234, 179, 8, 0.04)'
                                            }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '10px', height: '10px', minWidth: '10px', borderRadius: '50%', background: '#cbd5e1' }} />
                                                <div>
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>GrooveLab Modul</span>
                                                    <span style={{ fontSize: '0.62rem', background: '#fef3c7', color: '#854d0e', padding: '2px 6px', borderRadius: '100px', fontWeight: 800 }}>
                                                      Kombi-Vorteil +5,00 € / Mo.
                                                    </span>
                                                  </div>
                                                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                                    Live-Lab, Song-Bibliotheken &amp; Bands
                                                  </div>
                                                </div>
                                              </div>
                                              <button
                                                type="button"
                                                aria-label="GrooveLab Modul hinzubuchen"
                                                onClick={() => { setUpgradeTargetModule('groovelab'); setShowModuleUpgradeModal(true); }}
                                                className="hover-scale"
                                                style={{
                                                  background: '#eab308',
                                                  color: '#0f172a',
                                                  border: 'none',
                                                  borderRadius: '10px',
                                                  padding: '8px 12px',
                                                  fontSize: '0.74rem',
                                                  fontWeight: 800,
                                                  cursor: 'pointer',
                                                  whiteSpace: 'nowrap',
                                                  boxShadow: '0 2px 8px rgba(234, 179, 8, 0.25)'
                                                }}
                                              >
                                                Hinzubuchen ➔
                                              </button>
                                            </div>
                                          )}
                                        </div>

                                        {/* Row 2: Billing Payer, Student Fee, and Audio-Tresor Storage (3 Columns) */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                                          {/* Card 1: Who pays */}
                                          <div style={{
                                            background: '#ffffff',
                                            border: '1.5px solid #e2e8f0',
                                            padding: '16px',
                                            borderRadius: '18px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            minHeight: '142px',
                                            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
                                            boxSizing: 'border-box'
                                          }}>
                                            <div>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                <div style={{
                                                  width: '8px',
                                                  height: '8px',
                                                  minWidth: '8px',
                                                  borderRadius: '50%',
                                                  background: billingPayer === 'school' ? '#7e22ce' : '#0284c7',
                                                  boxShadow: `0 0 0 3px ${billingPayer === 'school' ? 'rgba(126, 34, 206, 0.18)' : 'rgba(2, 132, 199, 0.18)'}`
                                                }} />
                                                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                  Zahlungsmodell
                                                </span>
                                              </div>
                                              <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em', marginBottom: '3px' }}>
                                                {billingPayer === 'school' ? 'Zahlung: Musikschule' : 'Zahlung: Eltern'}
                                              </div>
                                              <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
                                                {billingPayer === 'school' ? 'Sammelabrechnung Träger (0,49 € / Mo.)' : 'Direktabrechnung (Jahresbeitrag)'}
                                              </div>
                                            </div>

                                            <button
                                              type="button"
                                              aria-label="Tarif und Zahler anpassen"
                                              onClick={() => {
                                                setSelectedSwitchTargetPayer(billingPayer);
                                                setShowSwitchBillingModelModal(true);
                                              }}
                                              style={{
                                                width: '100%',
                                                marginTop: '12px',
                                                background: billingPayer === 'school' ? '#0f172a' : '#0284c7',
                                                color: '#ffffff',
                                                border: 'none',
                                                borderRadius: '11px',
                                                padding: '9px 14px',
                                                fontSize: '0.75rem',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.1)',
                                                transition: 'all 0.15s ease'
                                              }}
                                              onMouseOver={(e) => {
                                                e.currentTarget.style.transform = 'translateY(-1px)';
                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.18)';
                                              }}
                                              onMouseOut={(e) => {
                                                e.currentTarget.style.transform = 'none';
                                                e.currentTarget.style.boxShadow = '0 2px 6px rgba(15, 23, 42, 0.1)';
                                              }}
                                            >
                                              <RefreshCw size={12} />
                                              <span>Tarif &amp; Zahler anpassen</span>
                                            </button>
                                          </div>

                                          {/* Card 2: Student cost */}
                                          <div style={{
                                            background: '#ffffff',
                                            border: '1.5px solid #e2e8f0',
                                            padding: '16px',
                                            borderRadius: '18px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            minHeight: '142px',
                                            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
                                            boxSizing: 'border-box'
                                          }}>
                                            <div>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                <div style={{
                                                  width: '8px',
                                                  height: '8px',
                                                  minWidth: '8px',
                                                  borderRadius: '50%',
                                                  background: billingPayer === 'school' ? '#16a34a' : '#0284c7',
                                                  boxShadow: `0 0 0 3px ${billingPayer === 'school' ? 'rgba(22, 163, 74, 0.18)' : 'rgba(2, 132, 199, 0.18)'}`
                                                }} />
                                                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                  Kosten pro Schüler
                                                </span>
                                              </div>
                                              <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em', marginBottom: '3px' }}>
                                                Beitrag für Schüler
                                              </div>
                                              <div style={{ fontSize: '0.74rem', color: billingPayer === 'school' ? '#15803d' : '#0369a1', fontWeight: 600 }}>
                                                {billingPayer === 'school' ? '0,00 € (100% Kostenfrei für Eltern)' : 'Einmaliger Direktbeitrag der Eltern'}
                                              </div>
                                            </div>

                                            <div style={{
                                              width: '100%',
                                              marginTop: '12px',
                                              background: billingPayer === 'school' ? '#f0fdf4' : '#f0f9ff',
                                              border: `1px solid ${billingPayer === 'school' ? '#bbf7d0' : '#bae6fd'}`,
                                              borderRadius: '11px',
                                              padding: '9px 12px',
                                              fontSize: '0.72rem',
                                              fontWeight: 700,
                                              color: billingPayer === 'school' ? '#15803d' : '#0284c7',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              gap: '6px',
                                              boxSizing: 'border-box'
                                            }}>
                                              <span>{billingPayer === 'school' ? '✓ Träger übernimmt 100%' : '✓ Dynamischer Jahresrestbeitrag'}</span>
                                            </div>
                                          </div>

                                          {/* Card 3: Audio-Tresor Cloud-Speicher Card */}
                                          {(() => {
                                            const addonGb = Number(currentSchoolProfile?.storage_addon_gb || selectedStorageAddonGb || 0);
                                            const addonFee = Number(currentSchoolProfile?.storage_addon_monthly_fee || (addonGb === 5 ? 1.49 : addonGb === 10 ? 1.99 : addonGb === 20 ? 3.99 : addonGb === 25 ? 3.99 : addonGb === 50 ? 6.99 : addonGb === 100 ? 11.99 : addonGb === 250 ? 24.99 : 0));
                                            const totalCapGb = 1.0 + addonGb;
                                            const usedBytes = getEffectiveStorageUsedBytes(currentSchoolProfile);
                                            const usedGb = usedBytes / (1024 * 1024 * 1024);
                                            const usedMb = usedBytes / (1024 * 1024);
                                            const formattedUsed = usedBytes <= 0 
                                              ? '0,0 MB' 
                                              : usedGb < 1.0 
                                                ? `${usedMb.toFixed(1).replace('.', ',')} MB` 
                                                : `${usedGb.toFixed(2).replace('.', ',')} GB`;
                                            const usagePct = totalCapGb > 0 ? Math.min(100, Math.max(0, (usedGb / totalCapGb) * 100)) : 0;
                                            const isWarning = usagePct >= 80;
                                            const isCritical = usagePct >= 95;

                                            return (
                                              <div style={{
                                                background: '#ffffff',
                                                border: `1.5px solid ${isCritical ? '#fca5a5' : isWarning ? '#fde68a' : '#e2e8f0'}`,
                                                padding: '16px',
                                                borderRadius: '18px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                minHeight: '142px',
                                                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
                                                boxSizing: 'border-box'
                                              }}>
                                                <div>
                                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                      <div style={{
                                                        width: '8px',
                                                        height: '8px',
                                                        minWidth: '8px',
                                                        borderRadius: '50%',
                                                        background: isCritical ? '#dc2626' : isWarning ? '#f59e0b' : '#10b981',
                                                        boxShadow: `0 0 0 3px ${isCritical ? 'rgba(220, 38, 38, 0.18)' : isWarning ? 'rgba(245, 158, 11, 0.18)' : 'rgba(16, 185, 129, 0.18)'}`
                                                      }} />
                                                      <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                        Audio-Tresor Speicher
                                                      </span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                      {currentSchoolProfile?.storage_pending_downgrade_gb !== null && currentSchoolProfile?.storage_pending_downgrade_gb !== undefined && (
                                                        <span style={{ fontSize: '0.62rem', background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '6px', fontWeight: 800 }}>
                                                          ⏳ Downgrade ({currentSchoolProfile?.storage_pending_downgrade_gb} GB)
                                                        </span>
                                                      )}
                                                      <span style={{ fontSize: '0.66rem', background: isCritical ? '#fee2e2' : isWarning ? '#fef3c7' : addonGb > 0 ? '#dcfce7' : '#f1f5f9', color: isCritical ? '#991b1b' : isWarning ? '#92400e' : addonGb > 0 ? '#166534' : '#475569', padding: '1px 7px', borderRadius: '6px', fontWeight: 700 }}>
                                                        {isCritical ? '🚨 95% Belegt' : isWarning ? '⚠️ 80% Belegt' : addonGb > 0 ? `+${addonGb} GB` : '1 GB Basis'}
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em', marginBottom: '3px' }}>
                                                    {formattedUsed} von {totalCapGb} GB <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>({usagePct.toFixed(0)}%)</span>
                                                  </div>

                                                  {/* Live Quota Bar */}
                                                  <div style={{ width: '100%', height: '5px', background: '#f1f5f9', borderRadius: '100px', overflow: 'hidden', margin: '6px 0 2px 0' }}>
                                                    <div style={{
                                                      width: `${usedBytes > 0 ? Math.max(3, usagePct) : 0}%`,
                                                      height: '100%',
                                                      background: isCritical ? '#dc2626' : isWarning ? '#f59e0b' : 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                                                      borderRadius: '100px',
                                                      transition: 'width 0.3s ease'
                                                    }} />
                                                  </div>
                                                </div>

                                                <button
                                                  type="button"
                                                  aria-label="Audio-Tresor Speicherplatz verwalten"
                                                  onClick={() => setShowStorageManagerModal(true)}
                                                  style={{
                                                    width: '100%',
                                                    marginTop: '12px',
                                                    background: '#f8fafc',
                                                    border: '1.5px solid #e2e8f0',
                                                    borderRadius: '11px',
                                                    padding: '8px 12px',
                                                    fontSize: '0.74rem',
                                                    fontWeight: 700,
                                                    color: '#0f172a',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                                    transition: 'all 0.15s ease'
                                                  }}
                                                  onMouseOver={(e) => {
                                                    e.currentTarget.style.background = '#ffffff';
                                                    e.currentTarget.style.borderColor = '#cbd5e1';
                                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                                    e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.06)';
                                                  }}
                                                  onMouseOut={(e) => {
                                                    e.currentTarget.style.background = '#f8fafc';
                                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                                    e.currentTarget.style.transform = 'none';
                                                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)';
                                                  }}
                                                >
                                                  <span>Speicher &amp; Tresor anpassen</span>
                                                  <ChevronRight size={12} color="#64748b" />
                                                </button>
                                              </div>
                                            );
                                          })()}
                                        </div>

                                        {/* Kombi-Vorteil Notice Banner */}
                                        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#475569', lineHeight: '1.45', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <span style={{ color: '#34a853', fontWeight: 800 }}>✓</span>
                                          <span><strong>Schuljahr 2026/2027 aktiv:</strong> Durch die Kombination von Campus &amp; GrooveLab spart eure Musikschule jeden Monat <strong>{((effectiveSchoolRates.priceCampus + effectiveSchoolRates.priceGroovelab) - effectiveSchoolRates.priceKombi).toFixed(2).replace('.', ',')} € Kombi-Vorteil</strong>.</span>
                                        </div>
                                      </div>

                                      {/* Apple Segmented Student Progress Bar */}
                                    <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                      <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                                          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Schüler-Aktivierungen</h4>
                                          <span style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 700 }}>
                                            <strong>{activeStudentsCount_global}</strong> / {students.length} aktiv
                                          </span>
                                        </div>
                                        
                                        {/* Apple-Style Segmented Battery Bar */}
                                        <div style={{ width: '100%', height: '10px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden', display: 'flex', padding: '2px' }}>
                                          <div style={{ width: (students.length > 0 ? Math.min(100, (activeStudentsCount_global / students.length) * 100) : 0) + '%', background: '#34a853', borderRadius: '9999px', transition: 'width 0.4s ease-out' }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', fontWeight: 500, marginTop: '6px' }}>
                                          <span>Aktivierte Schüler-Profile ({activeStudentsCount_global})</span>
                                          <span>Inaktive / Datenbank-Profile ({passiveStudentsCount_global})</span>
                                        </div>
                                      </div>

                                      {/* Info Box: How to add students */}
                                      <div style={{ 
                                        display: 'flex',
                                        gap: '12px',
                                        alignItems: 'center',
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '16px',
                                        padding: '14px 16px'
                                      }}>
                                        <div style={{
                                          width: '32px',
                                          height: '32px',
                                          borderRadius: '10px',
                                          background: '#f1f5f9',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          color: '#475569',
                                          flexShrink: 0
                                        }}>
                                          <Users size={16} />
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.4 }}>
                                          <span style={{ fontWeight: 700, color: '#0f172a' }}>Schüler hinzufügen &amp; aktivieren:</span>{' '}
                                          Neue Schüler legst du einfach in der Schülerverwaltung an. Solange sie nicht aktiviert sind, fallen für sie keine Bereitstellungsgebühren an.
                                        </div>
                                      </div>
                                    </div>

                                  </div>

                                  {/* Right Column (40%): Apple Pay Styled Invoice Card */}
                                  <div style={{ position: 'sticky', top: '20px' }}>
                                    {(() => {
                                      const totalMonthlySim = subscriptionBypass ? 0 : baseB2B_global;
                                      
                                      return (
                                        <div style={{
                                          background: '#ffffff',
                                          border: '1px solid #e2e8f0',
                                          borderRadius: '24px',
                                          padding: '24px',
                                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '18px',
                                          textAlign: 'left'
                                        }}>
                                          <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                              <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>ABRECHNUNG &amp; TARIFE</span>
                                              <h4 style={{ margin: '2px 0 0 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Aktuelle Ratenübersicht</h4>
                                            </div>
                                            {subscriptionBypass && (
                                              <span style={{ fontSize: '0.68rem', background: '#f3e8ff', color: '#7e22ce', padding: '4px 10px', borderRadius: '9999px', fontWeight: 700 }}>
                                                Abo-Bypass
                                              </span>
                                            )}
                                          </div>

                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.78rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                                              <span><CampusGroovelabText /> Software-Bereitstellung:</span>
                                              <strong style={{ color: '#34a853' }}>0,00 € (Inklusive)</strong>
                                            </div>

                                            {subscriptionBypass ? (
                                              <div style={{ padding: '12px 14px', borderRadius: '14px', background: '#faf5ff', border: '1px solid #f3e8ff', color: '#6b21a8', fontSize: '0.75rem', lineHeight: '1.4' }}>
                                                <div style={{ fontWeight: 800, marginBottom: '2px' }}>⚡ Kostenfreie Freistellung aktiv</div>
                                                <span>Alle Server-Hosting-Flatrates &amp; Bereitstellungsgebühren sind 100% freigestellt (0,00 € / Mo.).</span>
                                              </div>
                                            ) : (
                                              <>
                                                {hasCampusSub && (
                                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                                                    <span>Cloud- &amp; Datenbank-Hosting: Modul Campus:</span>
                                                    <strong>{effectiveSchoolRates.priceCampus.toFixed(2).replace('.', ',')} € / Mo.</strong>
                                                  </div>
                                                )}
                                                {hasGroovelabSub && (
                                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                                                    <span>Cloud- &amp; Datenbank-Hosting: Modul GrooveLab:</span>
                                                    <strong>{effectiveSchoolRates.priceGroovelab.toFixed(2).replace('.', ',')} € / Mo.</strong>
                                                  </div>
                                                )}
                                                {hasCampusSub && hasGroovelabSub && (
                                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontWeight: 600 }}>
                                                    <span>Kombi-Vorteilsrabatt (Infrastruktur-Bündel):</span>
                                                    <span>-{(effectiveSchoolRates.priceCampus + effectiveSchoolRates.priceGroovelab - effectiveSchoolRates.priceKombi).toFixed(2).replace('.', ',')} € / Mo.</span>
                                                  </div>
                                                )}
                                              </>
                                            )}
                                            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                              {!subscriptionBypass && billableTeachersCount > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                                                  <span>Service- &amp; Administrationspauschale ({billableTeachersCount} Lehrkräfte × {effectiveSchoolRates.priceTeacher.toFixed(2).replace('.', ',')} €):</span>
                                                  <strong>{(billableTeachersCount * effectiveSchoolRates.priceTeacher).toFixed(2).replace('.', ',')} € / Mo.</strong>
                                                </div>
                                              )}

                                              {passiveStudentsCount_global > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                                                  <span>Basis-Bereitstellung ({passiveStudentsCount_global} Schüler × 0,09 €):</span>
                                                  <strong>{subscriptionBypass ? '0,00 € (Freigestellt)' : `${(passiveStudentsCount_global * 0.09).toFixed(2).replace('.', ',')} € / Mo.`}</strong>
                                                </div>
                                              )}

                                              {!subscriptionBypass && activeStudentsCount_global > 0 && isSammelzahler && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                                                  <span>Cloud- & Modul-Bereitstellung: Campus ({activeStudentsCount_global} Schüler × {effectiveSchoolRates.priceStudent.toFixed(2).replace('.', ',')} €):</span>
                                                  <strong>{(activeStudentsCount_global * effectiveSchoolRates.priceStudent).toFixed(2).replace('.', ',')} € / Mo.</strong>
                                                </div>
                                              )}

                                              {!subscriptionBypass && activeGroovelabStudentsCount_global > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                                                  <span>Cloud- & Modul-Bereitstellung: GrooveLab ({activeGroovelabStudentsCount_global} Schüler × {effectiveSchoolRates.priceStudent.toFixed(2).replace('.', ',')} €):</span>
                                                  <strong>{(activeGroovelabStudentsCount_global * effectiveSchoolRates.priceStudent).toFixed(2).replace('.', ',')} € / Mo.</strong>
                                                </div>
                                              )}

                                              {/* Tresor Storage Add-on Line Item & Mini Progress Bar - Always shown for full transparency */}
                                              {(() => {
                                                const addonGb = Number(currentSchoolProfile?.storage_addon_gb || selectedStorageAddonGb || 0);
                                                const addonStatus = currentSchoolProfile?.storage_addon_status || 'active';
                                                const addonPendingGb = Number(currentSchoolProfile?.storage_addon_pending_gb || 0);
                                                const addonMonthlyFee = Number(currentSchoolProfile?.storage_addon_monthly_fee || selectedStorageAddonFee || (addonGb === 5 ? 1.49 : addonGb === 10 ? 1.99 : addonGb === 20 ? 3.99 : addonGb === 25 ? 3.99 : addonGb === 50 ? 6.99 : addonGb === 100 ? 11.99 : addonGb === 250 ? 24.99 : 0));
                                                
                                                const baseGb = 1.0;
                                                const totalCapGb = baseGb + addonGb;
                                                const usedBytes = getEffectiveStorageUsedBytes(currentSchoolProfile);
                                                const usedGb = usedBytes / (1024 * 1024 * 1024);
                                                const usedMb = usedBytes / (1024 * 1024);
                                                const freeGb = Math.max(0, totalCapGb - usedGb);
                                                const usagePct = Math.min(100, Math.round((usedGb / totalCapGb) * 100));
                                                const formattedUsed = usedBytes <= 0 
                                                  ? '0,0 MB' 
                                                  : usedGb < 1.0 
                                                    ? `${usedMb.toFixed(1).replace('.', ',')} MB` 
                                                    : `${usedGb.toFixed(2).replace('.', ',')} GB`;
                                                const formattedPct = usedBytes > 0 && usagePct < 1 ? '< 1%' : `${usagePct}%`;

                                                return (
                                                  <div style={{ borderTop: '1.5px dashed #e2e8f0', paddingTop: '10px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontSize: '0.74rem' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                          <HardDrive size={13} color="#34a853" />
                                                          <span>Audio-Tresor Speicher ({addonGb > 0 ? `+${addonGb} GB` : '1 GB Basis'}):</span>
                                                        </span>
                                                        <strong style={{ color: addonGb > 0 ? '#0f172a' : '#15803d' }}>
                                                          {subscriptionBypass ? '0,00 € (Freigestellt)' : addonGb > 0 ? `${addonMonthlyFee.toFixed(2).replace('.', ',')} € / Mo.` : 'Inklusive (0,00 €)'}
                                                        </strong>
                                                      </div>

                                                    {/* Mini Battery Progress Bar */}
                                                    <div style={{ background: '#f1f5f9', borderRadius: '6px', height: '6px', overflow: 'hidden', width: '100%', marginTop: '2px' }}>
                                                      <div style={{
                                                        height: '100%',
                                                        width: `${usedBytes > 0 ? Math.max(2, usagePct) : 0}%`,
                                                        background: usagePct > 80 ? '#ef4444' : 'linear-gradient(90deg, #34a853 0%, #10b981 100%)',
                                                        borderRadius: '6px',
                                                        transition: 'width 0.3s ease'
                                                      }} />
                                                    </div>

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: '#64748b', fontWeight: 600 }}>
                                                      <span>{formattedUsed} von {totalCapGb} GB belegt ({formattedPct})</span>
                                                      <span style={{ color: usagePct > 80 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>{freeGb.toFixed(2).replace('.', ',')} GB frei ({100 - usagePct}%)</span>
                                                    </div>

                                                    {addonPendingGb > 0 && addonStatus === 'pending_activation' && (
                                                      <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '4px 8px', fontSize: '0.65rem', color: '#92400e', fontWeight: 700, textAlign: 'center', marginTop: '2px' }}>
                                                        ⏳ +{addonPendingGb} GB Warten auf Hetzner-Aktivierung
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })()}
                                            </div>
                                          </div>

                                          {/* Total Rate Display */}
                                          <div style={{ borderTop: '1.5px solid #e2e8f0', paddingTop: '16px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>Gesamtrate:</span>
                                            <div style={{ textAlign: 'right' }}>
                                              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>
                                                {totalMonthlySim.toFixed(2).replace('.', ',')} € / Mo.
                                              </div>
                                              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Umsatzsteuerbefreit gemäß § 19 UStG</div>
                                            </div>
                                          </div>

                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: '#64748b', background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                            <Lock size={13} style={{ color: '#64748b' }} />
                                            <span>Abrechnung erfolgt am Monatsende. Rechnungen jederzeit einsehbar.</span>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              )}
                              
                        {/* Apple-designed Aktivierungsübersicht & Barzahler-Zahlungsabgleich */}
                        {activeBillingSubTab === 'matching' && (() => {
                          if (billingPayer === 'school') {
                            return (
                              <div style={{
                                background: '#ffffff',
                                border: '1px solid rgba(0, 0, 0, 0.08)',
                                borderRadius: '24px',
                                padding: '36px 24px',
                                textAlign: 'center',
                                boxShadow: '0 8px 30px rgba(0,0,0,0.02)',
                                marginTop: '20px',
                                marginBottom: '24px',
                                color: '#475569',
                                fontFamily: 'Inter, system-ui, sans-serif'
                              }}>
                                <School size={36} style={{ color: '#64748b', display: 'block', margin: '0 auto 12px' }} />
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>Kostenträger: Musikschule (Sammelzahler)</h4>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto', lineHeight: '1.4' }}>
                                  In diesem Tarifmodell übernimmt die Musikschule sämtliche Schülergebühren gesammelt. 
                                  Ein Zahlungsabgleich mit Schülerkonten oder Eltern ist nicht erforderlich, da keine direkten Gebühren für Schüler anfallen.
                                </p>
                              </div>
                            );
                          }

                          const deMonths = [
                            'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                            'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
                          ];
                          
                          // Filter active students for the selected month and year
                          const activatedStudentsInSelectedMonth = students.filter((s: any) => {
                            const isCurrentlyActive = s.isCampusActive || s.isGroovelabActive || s.is_campus_active || s.is_groovelab_active;
                            if (!isCurrentlyActive) return false;
                            const actDate = s.activated_at ? new Date(s.activated_at) : (s.created_at ? new Date(s.created_at) : null);
                            if (!actDate) return false;
                            return actDate.getMonth() === selectedDashboardMonth && actDate.getFullYear() === selectedDashboardYear;
                          });

                          const debitStudents = activatedStudentsInSelectedMonth.filter((s: any) => s.student_billing_payment_method === 'debit');
                          const cashStudents = activatedStudentsInSelectedMonth.filter((s: any) => s.student_billing_payment_method === 'cash' || !s.student_billing_payment_method);

                          // Available years for selection (e.g. from 2025 to current year + 1)
                          const availableYears = [2025, 2026, 2027];

                          return (
                            <div style={{
                              background: '#ffffff',
                              border: '1px solid rgba(0, 0, 0, 0.08)',
                              borderRadius: '24px',
                              padding: '24px',
                              boxShadow: '0 8px 30px rgba(0,0,0,0.02)',
                              marginTop: '20px',
                              marginBottom: '24px',
                              fontFamily: 'Inter, system-ui, sans-serif'
                            }}>
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                borderBottom: '1px solid #f1f5f9', 
                                paddingBottom: '16px',
                                marginBottom: '20px',
                                flexWrap: 'wrap',
                                gap: '12px'
                              }}>
                                <div>
                                  <span style={{ fontSize: '0.66rem', color: '#7c3aed', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Zahlungsabgleich &amp; Aktivierungen
                                  </span>
                                  <h3 style={{ margin: '4px 0 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', fontFamily: 'Urbanist, sans-serif' }}>
                                    Aktivierte Schülerprofile ({selectedDashboardMonth !== undefined ? deMonths[selectedDashboardMonth] : ''} {selectedDashboardYear})
                                  </h3>
                                </div>
                                
                                {/* Apple-style Dropdown Selectors */}
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <select 
                                    value={selectedDashboardMonth}
                                    onChange={(e) => setSelectedDashboardMonth(parseInt(e.target.value))}
                                    style={{
                                      background: '#f8fafc',
                                      border: '1px solid rgba(0, 0, 0, 0.08)',
                                      borderRadius: '12px',
                                      padding: '8px 14px',
                                      fontSize: '0.78rem',
                                      fontWeight: 700,
                                      color: '#0f172a',
                                      outline: 'none',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                    }}
                                  >
                                    {deMonths.map((mName, idx) => (
                                      <option key={idx} value={idx}>{mName}</option>
                                    ))}
                                  </select>
                                  <select 
                                    value={selectedDashboardYear}
                                    onChange={(e) => setSelectedDashboardYear(parseInt(e.target.value))}
                                    style={{
                                      background: '#f8fafc',
                                      border: '1px solid rgba(0, 0, 0, 0.08)',
                                      borderRadius: '12px',
                                      padding: '8px 14px',
                                      fontSize: '0.78rem',
                                      fontWeight: 700,
                                      color: '#0f172a',
                                      outline: 'none',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                    }}
                                  >
                                    {availableYears.map(yr => (
                                      <option key={yr} value={yr}>{yr}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                {/* Lastschrift Spalte */}
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '16px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.02em' }}>💳 Lastschrift / Abbuchung</span>
                                    <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '100px' }}>
                                      {debitStudents.length} Schüler
                                    </span>
                                  </div>
                                  {debitStudents.length === 0 ? (
                                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                                      Keine Lastschrifteinzüge in diesem Monat.
                                    </p>
                                  ) : (
                                    <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                                      {debitStudents.map((s: any) => (
                                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', padding: '8px 10px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.01)' }}>
                                          <strong style={{ color: '#0f172a' }}>{s.first_name} {s.last_name}</strong>
                                          <span style={{ color: '#64748b', fontSize: '0.68rem' }}>{s.instrument || 'Allgemein'}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Banküberweisung Spalte (100% Bargeldlos gem. ZAG & GoBD) */}
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '16px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.02em' }}>🏛️ Banküberweisung (Direktabrechnung)</span>
                                    <span style={{ background: '#e2e8f0', color: '#334155', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '100px' }}>
                                      {cashStudents.length} Schüler
                                    </span>
                                  </div>
                                  {cashStudents.length === 0 ? (
                                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                                      Keine offenen Direktüberweisungen in diesem Monat.
                                    </p>
                                  ) : (
                                    <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                                      {cashStudents.map((s: any) => {
                                        const isPaid = s.student_billing_cash_paid;
                                        return (
                                          <div 
                                            key={s.id} 
                                            style={{ 
                                              display: 'flex', 
                                              justifyContent: 'space-between', 
                                              alignItems: 'center', 
                                              fontSize: '0.74rem', 
                                              padding: '8px 10px', 
                                              background: isPaid ? '#e6f4ea' : '#ffffff', 
                                              borderRadius: '10px', 
                                              border: isPaid ? '1px solid #e6f4ea' : '1px solid #e2e8f0', 
                                              boxShadow: '0 2px 6px rgba(0,0,0,0.01)',
                                              transition: 'all 0.2s'
                                            }}
                                          >
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                              <strong style={{ color: isPaid ? '#34a853' : '#0f172a', textDecoration: isPaid ? 'line-through' : 'none' }}>
                                                {s.first_name} {s.last_name}
                                              </strong>
                                              <span style={{ color: '#64748b', fontSize: '0.68rem' }}>{s.instrument || 'Allgemein'}</span>
                                            </div>
                                            
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
                                              <input 
                                                type="checkbox"
                                                checked={!!isPaid}
                                                onChange={async (e) => {
                                                  const checked = e.target.checked;
                                                  try {
                                                    const { error } = await supabase
                                                      .from('users')
                                                      .update({ student_billing_cash_paid: checked })
                                                      .eq('id', s.id);
                                                    if (error) throw error;
                                                    
                                                    // Update local state instantly
                                                    s.student_billing_cash_paid = checked;
                                                    fetchDashboardData();
                                                  } catch (err: any) {
                                                    console.error("Error updating transfer status:", err);
                                                    alert("Fehler beim Speichern des Status: " + err.message);
                                                  }
                                                }}
                                                style={{ width: '14px', height: '14px', accentColor: '#34a853', cursor: 'pointer' }}
                                              />
                                              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: isPaid ? '#34a853' : '#475569' }}>
                                                {isPaid ? 'Verbucht' : 'Offen'}
                                              </span>
                                            </label>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', fontSize: '0.66rem', color: '#64748b', lineHeight: '1.4' }}>
                                    ⚖️ <strong>100% Bargeldlos (GoBD-Standard):</strong> Schüleraktivierungen erfolgen unbar per Banküberweisung. Der Haken bestätigt den Eingang auf dem Bankkonto.
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Slider & Invoices in dashboard */}
                        {activeBillingSubTab === 'history' && (
                          <div style={{ display: 'block', marginTop: '12px' }}>
                          {/* Aktive Schüler Info Card */}
                          <div style={{
                            padding: '20px',
                            borderRadius: '24px',
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.02)',
                            marginBottom: '16px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#64748b'
                              }}>
                                <Users size={20} />
                              </div>
                              <div>
                                <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>Schülerzugänge</span>
                                <strong style={{ display: 'block', fontSize: '1.2rem', color: '#0f172a', marginTop: '2px', fontFamily: 'Urbanist' }}>
                                  Aktive Schüler: <span style={{ color: '#ea4335' }}>{activeStudentsCount_global}</span>
                                </strong>
                              </div>
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#475569', lineHeight: '1.5', background: '#f8fafc', padding: '14px', borderRadius: '18px', border: '1px solid #f1f5f9' }}>
                              Hier siehst du, wie viele deiner Schüler **Campus-Groovelab** nutzen. Neue Schüler kannst du ganz einfach in der Schülerverwaltung eintragen.
                            </div>
                          </div>

                          {/* Schüler-Aktivierungsprüfung (Schnellsuche für Rechnungsnachweis) */}
                          <div style={{
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '24px',
                            padding: '18px 22px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.02)'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#fce8e6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Search size={15} color="#ea4335" />
                                </div>
                                <div>
                                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, fontFamily: 'Urbanist', color: '#0f172a' }}>
                                    Schüler-Aktivierungsprüfung (Rechnungsnachweis)
                                  </h4>
                                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                    Suche nach einem Schüler, um den genauen Aktivierungsmonat und die erste Sammelrechnung einzusehen
                                  </span>
                                </div>
                              </div>
                              {activationSearchQuery && (
                                <button
                                  type="button"
                                  aria-label="Suche zurücksetzen"
                                  onClick={() => setActivationSearchQuery('')}
                                  style={{
                                    border: 'none',
                                    background: '#f1f5f9',
                                    borderRadius: '8px',
                                    padding: '4px 10px',
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    color: '#475569'
                                  }}
                                >
                                  Suche zurücksetzen
                                </button>
                              )}
                            </div>

                            <div style={{ position: 'relative' }}>
                              <input
                                type="text"
                                value={activationSearchQuery}
                                onChange={(e) => setActivationSearchQuery(e.target.value)}
                                placeholder="Schülername oder Instrument eingeben (z. B. Dominik, Aurora, Finja)..."
                                style={{
                                  width: '100%',
                                  padding: '10px 14px 10px 36px',
                                  borderRadius: '12px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '0.80rem',
                                  background: '#f8fafc',
                                  outline: 'none',
                                  color: '#0f172a',
                                  boxSizing: 'border-box'
                                }}
                              />
                              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                            </div>

                            {/* Live Result Cards */}
                            {activationSearchQuery.trim().length > 0 && (() => {
                              const q = activationSearchQuery.trim().toLowerCase();
                              const matches = students.filter((s: any) => {
                                const full = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
                                const inst = (s.instrument || s.instrument_name || s.fach || '').toLowerCase();
                                return full.includes(q) || inst.includes(q);
                              });

                              if (matches.length === 0) {
                                return (
                                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontStyle: 'italic', padding: '8px 4px' }}>
                                    Kein Schüler für „{activationSearchQuery}“ gefunden.
                                  </div>
                                );
                              }

                              const deMonthsLocal = [
                                '', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                                'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
                              ];

                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                                  {matches.map((s: any) => {
                                    const firstName = s.first_name || s.vorname || '';
                                    const lastName = s.last_name || s.nachname || '';
                                    const name = `${firstName} ${lastName}`.trim() || 'Schüler ohne Namen';
                                    const instrument = s.instrument || s.instrument_name || s.fach || 'Schülerprofil';
                                    const isCampus = s.isCampusActive || s.is_campus_active;
                                    const isGroovelab = s.isGroovelabActive || s.is_groovelab_active;
                                    const isAnyActive = isCampus || isGroovelab;
                                    const actDate = s.activated_at ? new Date(s.activated_at) : (s.created_at ? new Date(s.created_at) : null);
                                    const actDateStr = actDate ? actDate.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Automatisch aktiv';
                                    const firstMonth = actDate ? `${deMonthsLocal[actDate.getMonth() + 1]} ${actDate.getFullYear()}` : null;
                                    const firstInvoiceId = actDate ? `AKT-${schoolNumericId}-${String(actDate.getFullYear()).slice(-2)}${String(actDate.getMonth() + 1).padStart(2, '0')}-01` : null;

                                    return (
                                      <div key={s.id} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '12px 16px',
                                        background: isAnyActive ? '#ffffff' : '#f8fafc',
                                        borderRadius: '14px',
                                        border: isAnyActive ? '1px solid #cbd5e1' : '1px dashed #cbd5e1',
                                        boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)'
                                      }}>
                                        <div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <strong style={{ fontSize: '0.84rem', color: '#0f172a' }}>{name}</strong>
                                            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>({instrument})</span>
                                            {isAnyActive ? (
                                              <span style={{ fontSize: '0.60rem', background: '#e6f4ea', color: '#137333', padding: '2px 6px', borderRadius: '100px', fontWeight: 800 }}>
                                                Aktiv
                                              </span>
                                            ) : (
                                              <span style={{ fontSize: '0.60rem', background: '#f1f5f9', color: '#64748b', padding: '2px 6px', borderRadius: '100px', fontWeight: 700 }}>
                                                Inaktiv
                                              </span>
                                            )}
                                          </div>
                                          <div style={{ fontSize: '0.70rem', color: '#475569', marginTop: '3px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                            <span>📅 Aktiviert am: <strong>{actDateStr}</strong></span>
                                            {firstMonth && (
                                              <span>🧾 1. Abrechnungsmonat: <strong>{firstMonth}</strong> ({firstInvoiceId})</span>
                                            )}
                                          </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                          {isCampus && (
                                            <span style={{ fontSize: '0.64rem', background: '#e6f4ea', color: '#137333', padding: '3px 8px', borderRadius: '100px', fontWeight: 700 }}>
                                              Campus (0,49 €)
                                            </span>
                                          )}
                                          {isGroovelab && (
                                            <span style={{ fontSize: '0.64rem', background: '#fef9c3', color: '#854d0e', padding: '3px 8px', borderRadius: '100px', fontWeight: 700 }}>
                                              GrooveLab (0,49 €)
                                            </span>
                                          )}
                                          {firstMonth && (
                                            <button
                                              type="button"
                                              aria-label={`Abrechnungsmonat ${firstMonth} öffnen`}
                                              onClick={() => {
                                                setExpandedYears(prev => ({ ...prev, [firstMonth]: true }));
                                                const el = document.getElementById(`month-section-${firstMonth.replace(/\s+/g, '-')}`);
                                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                              }}
                                              style={{
                                                border: '1px solid #cbd5e1',
                                                background: '#ffffff',
                                                color: '#0f172a',
                                                borderRadius: '8px',
                                                padding: '4px 10px',
                                                fontSize: '0.68rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                marginLeft: '4px'
                                              }}
                                              title={`Öffnet Abrechnungsmonat ${firstMonth}`}
                                            >
                                              Monat öffnen ↗
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                          
                          {/* Rechnungen list */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <h4 style={{ margin: '0', fontSize: '0.92rem', fontWeight: 800, fontFamily: 'Urbanist', color: '#1e293b' }}>Rechnungs-Historie</h4>
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.02)' }}>
                              {(() => {
                                const isAnnualBilling = studentBillingOption === 'option1' || studentBillingOption === 'option3_2' || studentBillingOption === 'debit' || studentBillingOption === 'cash' || studentBillingOption === 'both';
                                const annualPricePerStudent = (studentBillingOption === 'option1' || studentBillingOption === 'debit' || studentBillingOption === 'cash' || studentBillingOption === 'both') ? getDynamicAnnualPrice(contractStartDate, false) : studentBillingOption === 'option3_2' ? getDynamicAnnualPrice(contractStartDate, true) : 0;
                                const einmalzahlungTotal = isAnnualBilling ? students.length * annualPricePerStudent : 0;
                                
                                const isExtraAnnualBilling = extraBillingOption === 'option1' || extraBillingOption === 'option3_2';
                                const extraAnnualPrice = extraBillingOption === 'option1' ? getDynamicAnnualPrice(contractStartDate, false) : extraBillingOption === 'option3_2' ? getDynamicAnnualPrice(contractStartDate, true) : 0;
                                const extraEinmalzahlungTotal = isExtraAnnualBilling ? bookedExtraUsers * extraAnnualPrice : 0;
                                const totalB2BWithEinmalzahlung = currentTotalB2B + einmalzahlungTotal + extraEinmalzahlungTotal;

                                // Helper function to get last day of month as string
                                const getLastDayOfMonth = (monthName: string, yearVal: string) => {
                                  const monthsMap: Record<string, number> = {
                                    'Januar': 1, 'Februar': 2, 'März': 3, 'April': 4, 'Mai': 5, 'Juni': 6,
                                    'Juli': 7, 'August': 8, 'September': 9, 'Oktober': 10, 'November': 11, 'Dezember': 12
                                  };
                                  const m = monthsMap[monthName] || 6;
                                  const y = parseInt(yearVal, 10);
                                  const lastDay = new Date(y, m, 0).getDate();
                                  return `${lastDay}. ${monthName} ${y}`;
                                };

                                // Parse contractStartDate or default to June 12, 2026
                                const contractDateObj = contractStartDate ? new Date(contractStartDate) : new Date();
                                const startYear = contractDateObj.getFullYear();
                                const startMonth = contractDateObj.getMonth() + 1; // 1-indexed

                                const systemDate = simulatedToday ? new Date(simulatedToday + 'T19:30:38+02:00') : new Date();
                                const currentYear = systemDate.getFullYear();
                                const currentMonth = systemDate.getMonth() + 1;

                                const deMonths = [
                                  '', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                                  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
                                ];

                                const invoicesData: any[] = [];
                                let y = startYear;
                                let m = startMonth;

                                while (y < currentYear || (y === currentYear && m <= currentMonth)) {
                                  const monthStr = m < 10 ? `0${m}` : `${m}`;
                                  const yearShort = String(y).slice(-2);
                                  
                                  const lastDay = new Date(y, m, 0).getDate();
                                  const monthName = deMonths[m];
                                  const invoiceDateStr = `${lastDay}. ${monthName} ${y}`;
                                  
                                  const isCurrent = (y === currentYear && m === currentMonth);
                                  
                                  // The invoice is created at 23:58 on the last day of the month
                                  const creationTime = new Date(y, m - 1, lastDay, 23, 58, 0);
                                  const isCreated = systemDate.getTime() >= creationTime.getTime();
                                  
                                  const dueDateObj = new Date(y, m - 1, lastDay);
                                  dueDateObj.setDate(dueDateObj.getDate() + 14);
                                  const dueDay = dueDateObj.getDate();
                                  const dueMonthName = deMonths[dueDateObj.getMonth() + 1];
                                  const dueYear = dueDateObj.getFullYear();
                                  const dueDateStr = `${dueDay}. ${dueMonthName} ${dueYear}`;

                                  const infId = `INF-${schoolNumericId}-${yearShort}${monthStr}-01`;
                                  const aktId = `AKT-${schoolNumericId}-${yearShort}${monthStr}-01`;

                                  // Payment Status Invariant: Invoices are 'Versendet' (open) until actually marked as paid via bank reconciliation!
                                  let paidInvoicesList: string[] = [];
                                  try {
                                    const storedPaid = localStorage.getItem(`paid_invoices_${schoolId}`);
                                    paidInvoicesList = storedPaid ? JSON.parse(storedPaid) : [];
                                  } catch {}

                                  const isInfPaid = paidInvoicesList.includes(infId) || paidInvoicesList.includes(`RE-${schoolNumericId}-${yearShort}${monthStr}-01`);
                                  const isAktPaid = paidInvoicesList.includes(aktId);

                                  const infStatus = isInfPaid ? 'Bezahlt' : (isCreated ? 'Versendet' : 'Vorschau');
                                  const aktStatus = isAktPaid ? 'Bezahlt' : (isCreated ? 'Versendet' : 'Vorschau');

                                  // Calculate clean 2-Rechnung-Trennung (INF vs. AKT)
                                  const targetMonthZeroIndexed = m - 1;
                                  const targetYear = y;
                                  const targetMonthEnd = new Date(y, m, 0, 23, 59, 59, 999);
                                  const targetMonthStart = new Date(y, m - 1, 1, 0, 0, 0, 0);

                                  // Calculate exact historical active students for this specific month
                                  const studentsActiveInMonth = students.filter((s: any) => {
                                    const actDate = s.activated_at ? new Date(s.activated_at) : (s.created_at ? new Date(s.created_at) : null);
                                    if (actDate && actDate > targetMonthEnd) return false;
                                    if (s.contract_ends_at && new Date(s.contract_ends_at) < targetMonthStart) return false;
                                    return s.isCampusActive || s.isGroovelabActive || s.is_campus_active || s.is_groovelab_active;
                                  });

                                  const monthCampusActiveCount = isCurrent 
                                    ? activeStudentsCount_global 
                                    : studentsActiveInMonth.filter((s: any) => s.isCampusActive || s.is_campus_active).length;

                                  const monthGroovelabActiveCount = isCurrent 
                                    ? activeGroovelabStudentsCount_global 
                                    : studentsActiveInMonth.filter((s: any) => s.isGroovelabActive || s.is_groovelab_active).length;

                                  const monthTotalStudents = isCurrent 
                                    ? students.length 
                                    : students.filter((s: any) => {
                                        const actDate = s.activated_at ? new Date(s.activated_at) : (s.created_at ? new Date(s.created_at) : null);
                                        if (actDate && actDate > targetMonthEnd) return false;
                                        return true;
                                      }).length;

                                  const monthPassiveCount = isCurrent 
                                    ? passiveStudentsCount_global 
                                    : Math.max(0, monthTotalStudents - Math.max(monthCampusActiveCount, monthGroovelabActiveCount));

                                  const monthPassiveFee = parseFloat((monthPassiveCount * 0.09).toFixed(2));
                                  const monthGroovelabStudentFee = parseFloat((monthGroovelabActiveCount * (effectiveSchoolRates.priceStudent || 0.49)).toFixed(2));

                                  // 1. Infrastruktur-Rechnung enthält Software, Hosting, Lehrkräfte, Basis-Bereitstellung, Audio-Tresor UND GrooveLab-Schüleraktivierungen (da GrooveLab immer von Musikschule getragen wird)
                                  const infPureAmount = subscriptionBypass ? 0 : parseFloat((moduleCost_global + teacherServiceFeeTotal_global + monthPassiveFee + storageAddonFee_global + monthGroovelabStudentFee).toFixed(2));

                                  // 2. Sammelrechnung Schüleraktivierungen enthält ab sofort NUR noch die Campus-Schüleraktivierungen
                                  const monthAktPureAmount = subscriptionBypass ? 0 : parseFloat((
                                    monthCampusActiveCount * (effectiveSchoolRates.priceStudent || 0.49)
                                  ).toFixed(2));

                                  const monthActivations = students.filter((s: any) => {
                                    const isCurrentlyActive = s.isCampusActive || s.isCampusActive || s.is_campus_active;
                                    if (!isCurrentlyActive) return false;
                                    const actDate = s.activated_at ? new Date(s.activated_at) : (s.created_at ? new Date(s.created_at) : null);
                                    if (!actDate) return false;
                                    return actDate.getMonth() === targetMonthZeroIndexed && actDate.getFullYear() === targetYear;
                                  });
                                  const monthActivationsCount = monthActivations.length;

                                  const monthsMapLocal: Record<number, number> = {
                                    9: 12, 10: 11, 11: 10, 12: 9, 1: 8, 2: 7, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1
                                  };
                                  const restmonate = monthsMapLocal[m] !== undefined ? monthsMapLocal[m] : 12;
                                  let studentFee = effectiveSchoolRates.priceStudent || 0.49;
                                  let effectiveActivationsCount = monthCampusActiveCount;
                                  let invoiceStudentsList: any[] = [];

                                  if (studentBillingOption === "option3_3") {
                                    studentFee = effectiveSchoolRates.priceStudent ? effectiveSchoolRates.priceStudent * 0.8 : 0.39;
                                    effectiveActivationsCount = monthTotalStudents;
                                    invoiceStudentsList = isCurrent ? students : students.filter((s: any) => {
                                      const actDate = s.activated_at ? new Date(s.activated_at) : (s.created_at ? new Date(s.created_at) : null);
                                      if (actDate && actDate > targetMonthEnd) return false;
                                      return true;
                                    });
                                  } else if (studentBillingOption === "option3_2") {
                                    studentFee = effectiveSchoolRates.priceStudent ? effectiveSchoolRates.priceStudent * 0.9 : 0.44;
                                    effectiveActivationsCount = isCurrent ? monthActivationsCount : studentsActiveInMonth.length;
                                    invoiceStudentsList = isCurrent ? monthActivations : studentsActiveInMonth;
                                  } else {
                                    studentFee = effectiveSchoolRates.priceStudent || 0.49;
                                    effectiveActivationsCount = monthCampusActiveCount;
                                    invoiceStudentsList = isCurrent ? students.filter((s: any) => s.isCampusActive || s.is_campus_active) : studentsActiveInMonth.filter((s: any) => s.isCampusActive || s.is_campus_active);
                                  }
                                  
                                  let aktAmount = monthAktPureAmount;
                                  if (studentBillingOption === "option3_3") {
                                    aktAmount = subscriptionBypass ? 0 : parseFloat((monthTotalStudents * studentFee * 12).toFixed(2));
                                  } else if (studentBillingOption === "option3_2") {
                                    aktAmount = subscriptionBypass ? 0 : parseFloat((effectiveActivationsCount * studentFee * restmonate).toFixed(2));
                                  }

                                  // GoBD Revisionssicherheit: Snapshotting for completed months (v5)
                                  let infRecord: any = {
                                    id: infId,
                                    type: "INF",
                                    year: String(y),
                                    monthName: monthName,
                                    date: invoiceDateStr,
                                    dueDateStr: dueDateStr,
                                    isCurrentMonth: isCurrent,
                                    b2b: infPureAmount,
                                    amount: infPureAmount,
                                    schoolStudentCost: 0,
                                    schoolStudentLevy: 0,
                                    schoolExtraCost: 0,
                                    extraLevyMonthly: 0,
                                    extraEinmalzahlung: 0,
                                    b2c: 0,
                                    einmalzahlung: 0,
                                    status: infStatus,
                                    paid: isInfPaid,
                                    creationTime: creationTime,
                                    totalTeachersCount: billableTeachersCount,
                                    passiveStudentsCount: monthPassiveCount,
                                    passiveStudentsHostingFee: monthPassiveFee,
                                    activeGroovelabCount: monthGroovelabActiveCount,
                                    groovelabStudentsHostingFee: monthGroovelabStudentFee,
                                    storageAddonGb: Number(currentSchoolProfile?.storage_addon_gb || selectedStorageAddonGb || 0),
                                    storageAddonMonthlyFee: selectedStorageAddonFee || Number(currentSchoolProfile?.storage_addon_monthly_fee || 0),
                                    auditHash: `CG-INF-${schoolNumericId}-${yearShort}${monthStr}`,
                                    gobd_version: 5,
                                    activatedStudentsList: []
                                  };

                                  let aktRecord: any = {
                                    id: aktId,
                                    type: "AKT",
                                    year: String(y),
                                    monthName: monthName,
                                    date: invoiceDateStr,
                                    dueDateStr: dueDateStr,
                                    isCurrentMonth: isCurrent,
                                    b2b: 0,
                                    amount: aktAmount,
                                    schoolStudentCost: 0,
                                    schoolStudentLevy: 0,
                                    schoolExtraCost: 0,
                                    extraLevyMonthly: 0,
                                    extraEinmalzahlung: 0,
                                    b2c: aktAmount,
                                    einmalzahlung: (studentBillingOption === "option3_2" || studentBillingOption === "option3_3") ? aktAmount : 0,
                                    status: aktStatus,
                                    paid: isAktPaid,
                                    creationTime: creationTime,
                                    activeCampusCount: monthCampusActiveCount,
                                    activeGroovelabCount: 0,
                                    passiveStudentsCount: 0,
                                    activationsCount: effectiveActivationsCount,
                                    restmonate: restmonate,
                                    studentFee: studentFee,
                                    auditHash: `CG-AKT-${schoolNumericId}-${yearShort}${monthStr}`,
                                    gobd_version: 5,
                                    activatedStudentsList: invoiceStudentsList.map((s: any) => {
                                      const isNewlyActivated = (() => {
                                        if (!s.activated_at) return false;
                                        const d = new Date(s.activated_at);
                                        return d.getMonth() === targetMonthZeroIndexed && d.getFullYear() === targetYear;
                                      })();
                                      return {
                                        id: s.id,
                                        first_name: s.first_name || s.vorname || '',
                                        last_name: s.last_name || s.nachname || '',
                                        instrument: s.instrument || s.instrument_name || s.fach || s.subject || 'Schülerprofil',
                                        isCampusActive: !!(s.isCampusActive || s.is_campus_active),
                                        isGroovelabActive: !!(s.isGroovelabActive || s.is_groovelab_active),
                                        activated_at: s.activated_at || s.created_at || null,
                                        isNewlyActivated: isNewlyActivated
                                      };
                                    })
                                  };

                                  // GoBD Freeze: If month is closed, read from or persist to immutable snapshot (v5)
                                  if (typeof window !== "undefined" && !isCurrent) {
                                    try {
                                      const snapInfKey = `campus_gobd_v5_${schoolId}_${infId}`;
                                      const snapAktKey = `campus_gobd_v5_${schoolId}_${aktId}`;
                                      const storedInf = localStorage.getItem(snapInfKey);
                                      const storedAkt = localStorage.getItem(snapAktKey);
                                      if (storedInf) {
                                        const parsed = JSON.parse(storedInf);
                                        if (parsed && parsed.gobd_version === 5 && parsed.amount > 0) {
                                          infRecord = { ...infRecord, ...parsed, isCurrentMonth: false };
                                        } else if (infRecord.amount > 0) {
                                          localStorage.setItem(snapInfKey, JSON.stringify(infRecord));
                                        }
                                      } else if (infRecord.amount > 0) {
                                        localStorage.setItem(snapInfKey, JSON.stringify(infRecord));
                                      }
                                      if (storedAkt) {
                                        const parsed = JSON.parse(storedAkt);
                                        if (parsed && parsed.gobd_version === 5 && parsed.amount !== undefined && parsed.amount > 0) {
                                          aktRecord = { 
                                            ...aktRecord, 
                                            ...parsed, 
                                            amount: parsed.amount, 
                                            isCurrentMonth: false,
                                            activatedStudentsList: (parsed.activatedStudentsList && parsed.activatedStudentsList.length > 0)
                                              ? parsed.activatedStudentsList
                                              : aktRecord.activatedStudentsList
                                          };
                                        } else if (aktRecord.amount > 0 && students.length > 0) {
                                          localStorage.setItem(snapAktKey, JSON.stringify(aktRecord));
                                        }
                                      } else if (aktRecord.amount > 0 && students.length > 0) {
                                        localStorage.setItem(snapAktKey, JSON.stringify(aktRecord));
                                      }
                                       // Synchronize GoBD snapshot to Supabase invoices table
                                       if (supabase && schoolId) {
                                         if (infRecord.amount > 0) {
                                           supabase.from('invoices').upsert({
                                             id: infId,
                                             school_id: schoolId,
                                             type: 'INF',
                                             amount: infRecord.amount,
                                             status: infRecord.status || (isInfPaid ? 'Bezahlt' : 'Versendet'),
                                             billing_date: `${y}-${monthStr}-01`,
                                             due_date: `${y}-${monthStr}-15`,
                                             items: {
                                               amount: infRecord.amount,
                                               id: infRecord.id,
                                               status: infRecord.status || (isInfPaid ? 'Bezahlt' : 'Versendet'),
                                               totalTeachersCount: infRecord.totalTeachersCount,
                                               passiveStudentsCount: infRecord.passiveStudentsCount,
                                               activeGroovelabCount: infRecord.activeGroovelabCount,
                                               groovelabStudentsHostingFee: infRecord.groovelabStudentsHostingFee,
                                               storageAddonGb: infRecord.storageAddonGb,
                                               storageAddonMonthlyFee: infRecord.storageAddonMonthlyFee,
                                               auditHash: infRecord.auditHash,
                                               gobd_version: 5
                                             }
                                           }, { onConflict: 'id' }).then(() => {});
                                         }
                                         if (aktRecord.amount > 0) {
                                           supabase.from('invoices').upsert({
                                             id: aktId,
                                             school_id: schoolId,
                                             type: 'AKT',
                                             amount: aktRecord.amount,
                                             status: aktRecord.status || (isAktPaid ? 'Bezahlt' : 'Versendet'),
                                             billing_date: `${y}-${monthStr}-01`,
                                             due_date: `${y}-${monthStr}-15`,
                                             items: {
                                               amount: aktRecord.amount,
                                               id: aktRecord.id,
                                               status: aktRecord.status || (isAktPaid ? 'Bezahlt' : 'Versendet'),
                                               activeCampusCount: aktRecord.activeCampusCount,
                                               activeGroovelabCount: 0,
                                               passiveStudentsCount: 0,
                                               activationsCount: aktRecord.activationsCount,
                                               studentFee: aktRecord.studentFee,
                                               auditHash: aktRecord.auditHash,
                                               gobd_version: 5,
                                               activatedStudentsList: aktRecord.activatedStudentsList
                                             }
                                           }, { onConflict: 'id' }).then(() => {});
                                         }
                                       }
                                    } catch (e) {
                                      // Non-blocking
                                    }
                                  }

                                  // 1. Infrastruktur-Rechnung (INF)
                                  invoicesData.push(infRecord);

                                  // 2. Sammelrechnung Schüleraktivierungen (AKT)
                                  if (aktRecord.amount > 0 && (billingPayer === "school" || studentBillingOption === "option2" || studentBillingOption === "option3_2" || studentBillingOption === "option3_3")) {
                                    invoicesData.push(aktRecord);
                                  }
                                                                  // Increment month
                                  m++;
                                  if (m > 12) {
                                    m = 1;
                                    y++;
                                  }
                                }

                                // Reverse order so the newest is on top
                                invoicesData.reverse();

                                const grouped: Record<string, typeof invoicesData> = {};
                                const monthKeys: string[] = [];
                                invoicesData.forEach(inv => {
                                  const key = `${inv.monthName} ${inv.year}`;
                                  if (!grouped[key]) {
                                    grouped[key] = [];
                                    monthKeys.push(key);
                                  }
                                  grouped[key].push(inv);
                                });

                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    {monthKeys.map((monthKey) => {
                                      const isExpanded = expandedYears[monthKey] !== false;
                                      return (
                                        <div key={monthKey} id={`month-section-${monthKey.replace(/\s+/g, '-')}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                          <div 
                                            onClick={() => setExpandedYears(prev => ({ ...prev, [monthKey]: !isExpanded }))}
                                            style={{
                                              background: '#f8fafc',
                                              padding: '12px 20px',
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center',
                                              cursor: 'pointer',
                                              fontWeight: 800,
                                              fontSize: '0.8rem',
                                              color: '#475569',
                                              userSelect: 'none'
                                            }}
                                          >
                                            <span><Calendar size={13} style={{ marginRight: '6px', color: '#ea4335', verticalAlign: 'middle' }} />Abrechnungsmonat {monthKey}</span>
                                            <span>{isExpanded ? '▼' : '▶'}</span>
                                          </div>
                                          
                                          {isExpanded && grouped[monthKey].map((inv) => (
                                            <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#ffffff' }}>
                                              <div>
                                                <strong style={{ display: 'block', fontSize: '0.78rem', color: '#0f172a' }}>
                                                  {inv.amount < 0 
                                                    ? inv.id.replace('INV-', 'GS-') 
                                                    : inv.id.replace('INV-', 'RE-')}
                                                </strong>
                                                <span style={{ fontSize: '0.65rem', color: inv.type === 'INF' ? '#0369a1' : '#6b21a8', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, marginTop: '2px' }}>
                                                   {inv.type === 'INF' ? (
                                                     <>
                                                       <CreditCard size={12} style={{ verticalAlign: 'middle', color: '#0369a1' }} />
                                                       Service- &amp; Infrastrukturgebühren
                                                     </>
                                                   ) : (
                                                     <>
                                                       <Users size={12} style={{ verticalAlign: 'middle', color: '#6b21a8' }} />
                                                       {billingPayer === 'student' ? 'Direktabrechnung Schüleraktivierungen' : 'Sammelabrechnung Schüleraktivierungen'}
                                                     </>
                                                   )}
                                                </span>
                                                 <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>
                                                   Rechnungsdatum: {getLastDayOfMonth(inv.monthName, inv.year)}
                                                 </span>
                                                 <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block', fontWeight: 600 }}>
                                                   Zahlbar bis: {inv.dueDateStr}
                                                 </span>
                                              </div>
                                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', fontSize: '0.74rem' }}>
                                                <div style={{ color: inv.type === 'INF' ? '#0369a1' : '#34a853', fontWeight: 800 }}>
                                                  Betrag: {inv.amount.toFixed(2).replace('.', ',')} €
                                                </div>
                                                {(inv.type === 'AKT' || (inv.type === 'INF' && (inv.activatedStudentsList?.length || 0) > 0)) && (
                                                   <div style={{ 
                                                     fontSize: '0.58rem', 
                                                     color: billingPayer === 'student' ? '#34a853' : '#ea580c', 
                                                     background: billingPayer === 'student' ? '#e6f4ea' : '#ffedd5', 
                                                     border: billingPayer === 'student' ? '1px solid #e6f4ea' : '1px solid #fed7aa',
                                                     padding: '4px 8px', 
                                                     borderRadius: '6px', 
                                                     fontWeight: 800 
                                                   }}>
                                                     {billingPayer === 'student' ? 'Direktabrechnung (keine Kosten für Schule)' : 'Sammelabrechnung (Kosten trägt Musikschule)'}
                                                   </div>
                                                 )}
                                              </div>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                {(() => {
                                                  const isPaid = inv.status === 'Bezahlt' || inv.status === 'paid' || inv.paid === true;
                                                  const isSent = inv.status === 'Versendet' || inv.status === 'sent';
                                                  const isPreview = inv.status === 'Vorschau' || inv.status === 'preview' || inv.isCurrentMonth;
                                                  const statusLabel = isPaid ? 'Bezahlt' : isSent ? 'Versendet' : isPreview ? 'Vorschau' : inv.status;
                                                  const badgeBg = isPaid ? '#e0f2fe' : isSent ? '#e6f4ea' : '#fef3c7';
                                                  const badgeColor = isPaid ? '#0369a1' : isSent ? '#34a853' : '#d97706';
                                                  return (
                                                    <span style={{ 
                                                      background: badgeBg, 
                                                      color: badgeColor, 
                                                      fontSize: '0.62rem', 
                                                      padding: '6px 14px', 
                                                      borderRadius: '100px', 
                                                      fontWeight: 800 
                                                    }}>{statusLabel}</span>
                                                  );
                                                })()}
{inv.type === 'AKT' && (
                                                  <button 
                                                    onClick={() => setActiveStudentsModalList({ 
                                                      list: inv.activatedStudentsList || [], 
                                                      month: monthKey,
                                                      amount: inv.amount,
                                                      campusCount: inv.activeCampusCount,
                                                      groovelabCount: inv.activeGroovelabCount,
                                                      passiveCount: inv.passiveStudentsCount
                                                    })} 
                                                    className="hover-scale font-bold"
                                                    style={{ border: '1px solid #ea4335', background: '#fce8e6', color: '#ea4335', borderRadius: '10px', padding: '6px 12px', fontSize: '0.72rem', cursor: 'pointer', transition: 'all 0.2s', marginRight: '6px' }}
                                                  >
                                                    Schüler auflisten
                                                  </button>
                                                )}
                                                {(() => {
                                                  const isPaid = inv.status === 'Bezahlt' || inv.status === 'paid' || inv.paid === true;
                                                  return (
                                                    <>
                                                      {!isPaid && onOpenDunningPayModal && (
                                                        <button 
                                                          onClick={() => onOpenDunningPayModal(inv)} 
                                                          className="hover-scale font-bold"
                                                          style={{ border: '1px solid #16a34a', background: '#dcfce7', color: '#15803d', borderRadius: '10px', padding: '6px 12px', fontSize: '0.72rem', cursor: 'pointer', transition: 'all 0.2s', marginRight: '6px' }}
                                                        >
                                                          ⚡ Bezahlen
                                                        </button>
                                                      )}
                                                      <button 
                                                        onClick={() => setSelectedInvoice(inv)} 
                                                        className="hover-scale font-bold"
                                                        style={{ border: '1px solid #cbd5e1', background: '#ffffff', borderRadius: '10px', padding: '6px 12px', fontSize: '0.72rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                                      >
                                                        PDF
                                                      </button>
                                                    </>
                                                  );
                                                })()}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>

                          
                        </div>
                      )}

                      {/* Subtab: Buchungsjournal & Tarife (Revisionssicherer Ledger) */}
                      {activeBillingSubTab === 'ledger' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '14px', textAlign: 'left' }}>
                          {/* Header Info Card */}
                          <div style={{
                            padding: '22px 24px',
                            borderRadius: '24px',
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.02)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                  width: '42px',
                                  height: '42px',
                                  borderRadius: '12px',
                                  background: '#f0fdf4',
                                  border: '1px solid #bbf7d0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#16a34a'
                                }}>
                                  <ScrollText size={22} />
                                </div>
                                <div>
                                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                                    Revisionssicheres Buchungsjournal
                                  </h3>
                                  <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>
                                    Lückenloser Audit-Trail aller Tarif-, Modul- und Audio-Tresor Speicherbuchungen (OWASP ASVS Level 3 / GoBD-konform).
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={fetchTariffBookings}
                                style={{
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '10px',
                                  padding: '7px 14px',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  color: '#475569',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                <RefreshCw size={13} className={loadingTariffBookings ? 'animate-spin' : ''} />
                                Aktualisieren
                              </button>
                            </div>
                            <div style={{
                              fontSize: '0.72rem',
                              color: '#15803d',
                              background: '#f0fdf4',
                              border: '1px solid #dcfce7',
                              padding: '10px 14px',
                              borderRadius: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <ShieldCheck size={16} color="#16a34a" />
                              <span>
                                <strong>Unveränderbarkeit garantiert:</strong> Alle Einträge in diesem Journal sind schreibgeschützt (Append-Only) und mit kryptografischer Belegnummer auf deutschen Servern festgeschrieben.
                              </span>
                            </div>
                          </div>

                          {/* Bookings Table Card */}
                          <div style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '24px',
                            background: '#ffffff',
                            overflow: 'hidden',
                            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.02)'
                          }}>
                            <div style={{
                              padding: '16px 20px',
                              background: '#f8fafc',
                              borderBottom: '1px solid #e2e8f0',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                                Gebuchte Tarife &amp; Speicherbelege ({tariffBookings.length})
                              </span>
                              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                Neueste Buchungen zuerst
                              </span>
                            </div>

                            {loadingTariffBookings ? (
                              <div style={{ padding: '36px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                                <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 8px auto', color: '#34a853' }} />
                                Buchungsjournal wird geladen...
                              </div>
                            ) : tariffBookings.length === 0 ? (
                              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                                <ScrollText size={32} style={{ margin: '0 auto 10px auto', opacity: 0.3 }} />
                                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>Noch keine Buchungseinträge vorhanden</div>
                                <div style={{ fontSize: '0.74rem', marginTop: '4px' }}>
                                  Sobald du dein Paket oder deinen Audio-Tresor Speicher anpasst, wird der Beleg hier automatisch hinterlegt.
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {tariffBookings.map((b, idx) => {
                                  const isUpgrade = b.booking_type === 'STORAGE_UPGRADE';
                                  const isDowngrade = b.booking_type === 'STORAGE_DOWNGRADE' || b.booking_type === 'STORAGE_CANCEL';
                                  const isDowngradeCancel = b.booking_type === 'STORAGE_DOWNGRADE_CANCEL';
                                  const isBaseline = b.booking_type === 'INITIAL_BASELINE';
                                  const isSubBooking = b.booking_type === 'SUBSCRIPTION_BOOKING';

                                  const typeLabel = isUpgrade
                                    ? `Speicher-Upgrade (+${b.storage_addon_gb} GB)`
                                    : isDowngrade
                                      ? `Speicher-Reduzierung vorgemerkt (+${b.storage_pending_downgrade_gb ?? b.storage_addon_gb} GB)`
                                      : isDowngradeCancel
                                        ? 'Downgrade widerrufen'
                                        : isBaseline
                                          ? 'System-Baseline'
                                          : isSubBooking
                                            ? 'Schuljahres-Buchung'
                                            : b.booking_type;

                                  const badgeBg = isUpgrade || isSubBooking
                                    ? '#dcfce7'
                                    : isDowngrade
                                      ? '#fef3c7'
                                      : isDowngradeCancel
                                        ? '#f3e8ff'
                                        : isBaseline
                                          ? '#e0f2fe'
                                          : '#f1f5f9';

                                  const badgeColor = isUpgrade || isSubBooking
                                    ? '#166534'
                                    : isDowngrade
                                      ? '#92400e'
                                      : isDowngradeCancel
                                        ? '#6b21a8'
                                        : isBaseline
                                          ? '#0369a1'
                                          : '#475569';

                                  const formattedDate = new Date(b.created_at).toLocaleDateString('de-DE', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  });

                                  return (
                                    <div
                                      key={b.id || idx}
                                      style={{
                                        padding: '16px 20px',
                                        borderBottom: idx < tariffBookings.length - 1 ? '1px solid #f1f5f9' : 'none',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '16px',
                                        transition: 'background 0.15s ease'
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.background = '#fafbfc'}
                                      onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                                    >
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                                            {b.receipt_number}
                                          </span>
                                          <span style={{
                                            fontSize: '0.65rem',
                                            fontWeight: 800,
                                            background: badgeBg,
                                            color: badgeColor,
                                            padding: '2px 8px',
                                            borderRadius: '6px'
                                          }}>
                                            {typeLabel}
                                          </span>
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                          {formattedDate} Uhr • Gebucht durch: <strong>{b.booked_by_name || 'Schulleitung'}</strong>
                                        </div>
                                      </div>

                                      {/* Modules and Storage Details */}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, justifyContent: 'center' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#475569' }}>
                                          <span>Module: </span>
                                          <strong style={{ color: '#0f172a' }}>
                                            {b.has_campus_subscription && b.has_groovelab_subscription ? 'Campus + GrooveLab (Kombi)' : b.has_campus_subscription ? 'Campus' : 'GrooveLab'}
                                          </strong>
                                        </div>
                                        <div style={{ width: '1px', height: '18px', background: '#e2e8f0' }} />
                                        <div style={{ fontSize: '0.72rem', color: '#475569' }}>
                                          <span>Audio-Tresor: </span>
                                          <strong style={{ color: b.storage_addon_gb > 0 ? '#166534' : '#0f172a' }}>
                                            {b.storage_addon_gb > 0 ? `+${b.storage_addon_gb} GB (${Number(b.storage_addon_monthly_fee).toFixed(2).replace('.', ',')} €)` : '1 GB Basis (0,00 €)'}
                                          </strong>
                                          {b.storage_pending_downgrade_gb !== null && b.storage_pending_downgrade_gb !== undefined && (
                                            <span style={{ color: '#d97706', marginLeft: '6px', fontWeight: 700 }}>
                                              (Vorgemerkt auf +{b.storage_pending_downgrade_gb} GB zum {b.storage_pending_effective_date})
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Net Rate & Download Action */}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'right' }}>
                                        <div>
                                          <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a' }}>
                                            {Number(b.total_monthly_rate_net || 0).toFixed(2).replace('.', ',')} € / Mo.
                                          </div>
                                          <div style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: 700 }}>
                                            ✓ Verifiziert
                                          </div>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            generateTariffReceiptPDF({
                                              receiptNumber: b.receipt_number,
                                              schoolName: currentSchoolProfile?.name || schoolName || 'Musikschule',
                                              schoolAddress: {
                                                street: currentSchoolProfile?.street || '',
                                                zipCode: currentSchoolProfile?.zip_code || '',
                                                city: currentSchoolProfile?.city || '',
                                                country: currentSchoolProfile?.country || 'DE'
                                              },
                                              bookedBy: b.booked_by_name || 'Schulleitung',
                                              bookingType: b.booking_type,
                                              hasCampus: b.has_campus_subscription,
                                              hasGroovelab: b.has_groovelab_subscription,
                                              studentBillingOption: b.student_billing_option,
                                              storageAddonGb: b.storage_addon_gb,
                                              storageAddonFee: Number(b.storage_addon_monthly_fee || 0),
                                              storageStatus: b.storage_addon_status,
                                              storagePendingDowngradeGb: b.storage_pending_downgrade_gb,
                                              storagePendingEffectiveDate: b.storage_pending_effective_date,
                                              totalMonthlyRateNet: Number(b.total_monthly_rate_net || 0),
                                              currency: b.currency || 'EUR',
                                              effectiveDate: b.effective_date,
                                              createdAt: b.created_at,
                                              notes: b.notes
                                            });
                                          }}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '8px 14px',
                                            borderRadius: '10px',
                                            border: '1.5px solid #cbd5e1',
                                            background: '#ffffff',
                                            color: '#0f172a',
                                            fontSize: '0.74rem',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                            transition: 'all 0.15s ease'
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = '#34a853';
                                            e.currentTarget.style.color = '#166534';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = '#cbd5e1';
                                            e.currentTarget.style.color = '#0f172a';
                                          }}
                                        >
                                          <Download size={13} />
                                          PDF Beleg
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* SUB-TAB 5: RECHT & COMPLIANCE (B2B) */}
                      {activeBillingSubTab === 'compliance' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          <div style={{
                            background: '#ffffff',
                            borderRadius: '20px',
                            border: '1.5px solid #e2e8f0',
                            padding: '24px',
                            boxShadow: '0 4px 12px -2px rgba(0,0,0,0.03)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                              <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '12px',
                                background: '#f8fafc',
                                border: '1.5px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#0f172a'
                              }}>
                                <ShieldCheck size={24} />
                              </div>
                              <div>
                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>
                                  B2B Recht-, Datenschutz- & Compliance-Zentrale
                                </h3>
                                <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                                  Revisionssichere Dokumente, Zertifikate und Nachweise für Schulträger, Personalräte, Datenschutzbeauftragte und Kommunalprüfer.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                            gap: '16px'
                          }}>
                            {/* Card 1: AVV & TOMs */}
                            <div style={{
                              background: '#ffffff',
                              borderRadius: '20px',
                              border: '1.5px solid #e2e8f0',
                              padding: '22px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              boxShadow: '0 2px 8px -2px rgba(0,0,0,0.03)'
                            }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                  <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '10px',
                                    background: '#f0fdf4',
                                    border: '1px solid #bbf7d0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#166534'
                                  }}>
                                    <FileText size={18} />
                                  </div>
                                  <div>
                                    <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                                      AVV nach Art. 28 DSGVO & TOMs
                                    </h4>
                                    <span style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 700 }}>
                                      ISO 27001 / BSI C5 / EU-Hosting
                                    </span>
                                  </div>
                                </div>
                                <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.45, margin: '0 0 18px' }}>
                                  Auftragsverarbeitungsvertrag inklusive Anlage 1 (Technische und organisatorische Maßnahmen gem. Art. 32 DSGVO) sowie Subunternehmerverzeichnis mit reinem EU-Speicherort (Frankfurt am Main).
                                </p>
                              </div>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (setShowAvvModal) {
                                      setShowAvvModal(true);
                                    } else {
                                      generateEnterpriseSecurityWhitepaperPDF();
                                    }
                                  }}
                                  aria-label="Auftragsverarbeitungsvertrag öffnen und digital zeichnen"
                                  style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    padding: '10px 14px',
                                    borderRadius: '12px',
                                    background: '#0f172a',
                                    color: '#ffffff',
                                    fontSize: '0.78rem',
                                    fontWeight: 800,
                                    border: 'none',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                  }}
                                >
                                  <FileText size={14} />
                                  AVV öffnen & zeichnen
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    generateEnterpriseSecurityWhitepaperPDF();
                                  }}
                                  title="Sicherheits-Whitepaper herunterladen"
                                  aria-label="Enterprise Sicherheits-Whitepaper als PDF herunterladen"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '10px 14px',
                                    borderRadius: '12px',
                                    background: '#f8fafc',
                                    color: '#0f172a',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    border: '1.5px solid #cbd5e1',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Download size={14} />
                                </button>
                              </div>
                            </div>

                            {/* Card 2: Personalrats- & Mitbestimmungs-Attest */}
                            <div style={{
                              background: '#ffffff',
                              borderRadius: '20px',
                              border: '1.5px solid #e2e8f0',
                              padding: '22px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              boxShadow: '0 2px 8px -2px rgba(0,0,0,0.03)'
                            }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                  <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '10px',
                                    background: '#eff6ff',
                                    border: '1px solid #bfdbfe',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#1e40af'
                                  }}>
                                    <Award size={18} />
                                  </div>
                                  <div>
                                    <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                                      Personalrats- & Mitbestimmungs-Attest
                                    </h4>
                                    <span style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: 700 }}>
                                      § 87 Abs. 1 Nr. 6 BetrVG / LPVG
                                    </span>
                                  </div>
                                </div>
                                <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.45, margin: '0 0 18px' }}>
                                  Konformitätsbestätigung zur Abwesenheit von Verhaltens- und Leistungskontrollen von Lehrkräften. Bestätigt, dass keine Überwachungs- oder Leistungs-Scores erhoben werden.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  generateStaffCouncilDeclarationPDF({
                                    schoolName: currentSchoolProfile?.name || schoolName || 'Musikschule'
                                  });
                                }}
                                aria-label="Personalrats- und Mitbestimmungs-Attest als PDF generieren"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  padding: '10px 14px',
                                  borderRadius: '12px',
                                  background: '#1d4ed8',
                                  color: '#ffffff',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  border: 'none',
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                }}
                              >
                                <Download size={14} />
                                PDF Attest generieren
                              </button>
                            </div>

                            {/* Card 3: DSB / DPO Compliance Dossier */}
                            <div style={{
                              background: '#ffffff',
                              borderRadius: '20px',
                              border: '1.5px solid #e2e8f0',
                              padding: '22px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              boxShadow: '0 2px 8px -2px rgba(0,0,0,0.03)'
                            }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                  <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '10px',
                                    background: '#fef3c7',
                                    border: '1px solid #fde68a',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#92400e'
                                  }}>
                                    <CheckCircle2 size={18} />
                                  </div>
                                  <div>
                                    <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                                      DSB / DPO Compliance Dossier
                                    </h4>
                                    <span style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: 700 }}>
                                      VVT Art. 30 & DSFA Art. 35 DSGVO
                                    </span>
                                  </div>
                                </div>
                                <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.45, margin: '0 0 18px' }}>
                                  Vollständiges Dossier für behördliche Datenschutzbeauftragte inkl. Textbaustein für das Verfahrensverzeichnis (VVT), Rollen-Berechtigungskonzept und Löschroutinen.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  generateDpoComplianceDossierPDF({
                                    schoolName: currentSchoolProfile?.name || schoolName || 'Musikschule'
                                  });
                                }}
                                aria-label="Datenschutzbeauftragten Compliance Dossier als PDF herunterladen"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  padding: '10px 14px',
                                  borderRadius: '12px',
                                  background: '#854d0e',
                                  color: '#ffffff',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  border: 'none',
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                }}
                              >
                                <Download size={14} />
                                PDF Dossier herunterladen
                              </button>
                            </div>

                            {/* Card 4: Kinderschutz-Zertifikat */}
                            <div style={{
                              background: '#ffffff',
                              borderRadius: '20px',
                              border: '1.5px solid #e2e8f0',
                              padding: '22px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              boxShadow: '0 2px 8px -2px rgba(0,0,0,0.03)'
                            }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                  <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '10px',
                                    background: '#fdf2f8',
                                    border: '1px solid #fbcfe8',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#9d174d'
                                  }}>
                                    <ShieldCheck size={18} />
                                  </div>
                                  <div>
                                    <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                                      Kinderschutz- & Safe-Space Zertifikat
                                    </h4>
                                    <span style={{ fontSize: '0.72rem', color: '#9d174d', fontWeight: 700 }}>
                                      § 8a SGB VIII / BKiSchG
                                    </span>
                                  </div>
                                </div>
                                <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.45, margin: '0 0 18px' }}>
                                  Nachweis über das institutionelle Kinderschutzkonzept: Geschlossenes Schul-Ökosystem, Verbot unmoderierter 1:1-Messenger, Vier-Augen-Prinzip und elterliche Einsichtnahme.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  generateMessengerSafetyCertificatePDF({
                                    schoolName: currentSchoolProfile?.name || schoolName || 'Musikschule'
                                  });
                                }}
                                aria-label="Kinderschutz und Safe Space Zertifikat als PDF herunterladen"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  padding: '10px 14px',
                                  borderRadius: '12px',
                                  background: '#9d174d',
                                  color: '#ffffff',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  border: 'none',
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                }}
                              >
                                <Download size={14} />
                                PDF Zertifikat herunterladen
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        );
      })()}
            </div>
          </div>

  );
}
