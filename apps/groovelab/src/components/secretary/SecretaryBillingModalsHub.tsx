import React, { Suspense, lazy } from 'react';
import { 
  Check, X, CheckCircle, FileText, Download, HardDrive, 
  Info, Sparkles, RefreshCw, ShieldCheck, Clock, Search,
  Cloud, Zap, Rocket, Crown, Database, CheckCircle2, Copy
} from 'lucide-react';
import { calculateSchoolYearDirectBilling, calculateTransitionEffectiveDate } from '../../utils/epcGiroCode';
import { StorageTier, DEFAULT_STORAGE_TIERS } from '../../domain/pricingEngine';

const InvoicePreviewModal = lazy(() => import('../InvoicePreviewModal').then(m => ({ default: m.InvoicePreviewModal })));

export interface SecretaryBillingModalsHubProps {
  // Common & Tenant
  schoolId: string;
  schoolNumericId?: number | string;
  schoolName: string;
  schoolStreet?: string;
  schoolHouseNumber?: string;
  schoolZipCode?: string;
  schoolCity?: string;
  supabase: any;
  currentSchoolProfile: any;
  setCurrentSchoolProfile: (val: any) => void;
  fetchDashboardData: () => Promise<void> | void;
  fetchTariffBookings?: () => Promise<void> | void;
  masterPricing?: any;
  students: any[];

  // 1. Tariff Change Modal
  showChangeTariffModal: boolean;
  setShowChangeTariffModal: (val: boolean) => void;
  selectedModalOption: any;
  setSelectedModalOption: (val: any) => void;
  studentBillingOption: any;
  setNextBillingOption: (val: any) => void;
  setNextBillingOptionEffectiveAt: (val: any) => void;

  // 2. Active Students Modal List
  activeStudentsModalList: any;
  setActiveStudentsModalList: (val: any) => void;
  modalStudentSearchQuery: string;
  setModalStudentSearchQuery: (val: string) => void;

  // 3. Switch Billing Model Modal
  showSwitchBillingModelModal: boolean;
  setShowSwitchBillingModelModal: (val: boolean) => void;
  selectedSwitchTargetPayer: 'school' | 'student';
  setSelectedSwitchTargetPayer: (val: 'school' | 'student') => void;
  billingPayer: 'school' | 'student';
  setBillingPayer: (val: 'school' | 'student') => void;
  setStudentBillingOption: (val: any) => void;
  isSwitchingPayer: boolean;
  setIsSwitchingPayer: (val: boolean) => void;

  // 4. Storage Manager Modal
  showStorageManagerModal: boolean;
  setShowStorageManagerModal: (val: boolean) => void;
  selectedStorageAddonGb: number;
  setSelectedStorageAddonGb: (val: number) => void;
  selectedStorageAddonFee: number;
  setSelectedStorageAddonFee: (val: number) => void;
  hasCampusSub: boolean;
  hasGroovelabSub: boolean;
  isSubmittingStorage: boolean;
  setIsSubmittingStorage: (val: boolean) => void;
  setStorageBookingSuccessModal: (val: any) => void;
  getEffectiveStorageUsedBytes: (profile?: any) => number;

  // 5. Storage Booking Success Modal
  storageBookingSuccessModal: any;

  // 6. Storage Termination Modal
  showStorageTerminationModal: boolean;
  setShowStorageTerminationModal: (val: boolean) => void;
  storageTerminationDays: number;
  setStorageTerminationDays: (val: number) => void;

  // 7. Invoice Preview Modal
  selectedInvoice: any;
  setSelectedInvoice: (val: any) => void;
  campusActivatedThisMonth?: boolean | number;
  groovelabActivatedThisMonth?: boolean | number;
  billableTeachersCount?: number;
  activeStudentsCount_global?: number;
  activeGroovelabStudentsCount_global?: number;
  passiveStudentsCount_global?: number;
  isSammelzahler?: boolean;
  operatorCompany?: string;
  operatorContact?: string;
  operatorStreet?: string;
  operatorZip?: string;
  operatorCity?: string;
  operatorIban?: string;
  operatorBic?: string;

  // 8. Cancel Modal
  showCancelModal: boolean;
  setShowCancelModal: (val: boolean) => void;
  simulatedToday?: string | Date;
  schoolContractEndsAt: string | null;
  setSchoolContractEndsAt: (val: string | null) => void;
  setIsCancelled: (val: boolean) => void;
  cancellationReason: string;
  setCancellationReason: (val: string) => void;
  setLastCancellationId?: (val: string) => void;
  getSchoolYearEndInfo: (simDate?: string | Date | null, existingEndIso?: string | null) => any;
  downloadCancellationReceiptPdf: (cancellationInfo: {
    cancellationId?: string;
    cancelledAt?: string | Date;
    effectiveEndDateFormatted: string;
    schoolName?: string;
  }) => Promise<void> | void;

  // 9. Module Upgrade Modal
  showModuleUpgradeModal: boolean;
  setShowModuleUpgradeModal: (val: boolean) => void;
  upgradeTargetModule: string | null;
  upgradeProcessing: boolean;
  setUpgradeProcessing: (val: boolean) => void;
  setHasCampusSub: (val: boolean) => void;
  setHasGroovelabSub: (val: boolean) => void;
  downloadUpgradeConfirmationPdf: (upgradeInfo: {
    upgradeId: string;
    targetModule: any;
    schoolName?: string;
    effectiveEndDateFormatted: string;
  }) => Promise<void> | void;
}

export const SecretaryBillingModalsHub: React.FC<SecretaryBillingModalsHubProps> = ({
  schoolId,
  schoolNumericId,
  schoolName,
  schoolStreet,
  schoolHouseNumber,
  schoolZipCode,
  schoolCity,
  supabase,
  currentSchoolProfile,
  setCurrentSchoolProfile,
  fetchDashboardData,
  fetchTariffBookings,
  masterPricing,
  students,

  showChangeTariffModal,
  setShowChangeTariffModal,
  selectedModalOption,
  setSelectedModalOption,
  studentBillingOption,
  setNextBillingOption,
  setNextBillingOptionEffectiveAt,

  activeStudentsModalList,
  setActiveStudentsModalList,
  modalStudentSearchQuery,
  setModalStudentSearchQuery,

  showSwitchBillingModelModal,
  setShowSwitchBillingModelModal,
  selectedSwitchTargetPayer,
  setSelectedSwitchTargetPayer,
  billingPayer,
  setBillingPayer,
  setStudentBillingOption,
  isSwitchingPayer,
  setIsSwitchingPayer,

  showStorageManagerModal,
  setShowStorageManagerModal,
  selectedStorageAddonGb,
  setSelectedStorageAddonGb,
  selectedStorageAddonFee,
  setSelectedStorageAddonFee,
  hasCampusSub,
  hasGroovelabSub,
  isSubmittingStorage,
  setIsSubmittingStorage,
  setStorageBookingSuccessModal,
  getEffectiveStorageUsedBytes,

  storageBookingSuccessModal,

  showStorageTerminationModal,
  setShowStorageTerminationModal,
  storageTerminationDays,
  setStorageTerminationDays,

  selectedInvoice,
  setSelectedInvoice,
  campusActivatedThisMonth = 0,
  groovelabActivatedThisMonth = 0,
  billableTeachersCount = 0,
  activeStudentsCount_global = 0,
  activeGroovelabStudentsCount_global = 0,
  passiveStudentsCount_global = 0,
  isSammelzahler = false,
  operatorCompany,
  operatorContact,
  operatorStreet,
  operatorZip,
  operatorCity,
  operatorIban,
  operatorBic,

  showCancelModal,
  setShowCancelModal,
  simulatedToday,
  schoolContractEndsAt,
  setSchoolContractEndsAt,
  setIsCancelled,
  cancellationReason,
  setCancellationReason,
  setLastCancellationId,
  getSchoolYearEndInfo,
  downloadCancellationReceiptPdf,

  showModuleUpgradeModal,
  setShowModuleUpgradeModal,
  upgradeTargetModule,
  upgradeProcessing,
  setUpgradeProcessing,
  setHasCampusSub,
  setHasGroovelabSub,
  downloadUpgradeConfirmationPdf
}) => {
  return (
    <>
      {/* Modal for scheduled billing option change */}
      {showChangeTariffModal && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="tariff-change-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowChangeTariffModal(false);
          }}
          style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '520px',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #f1f5f9',
            fontFamily: 'Inter',
            animation: 'scaleUp 0.2s ease-out'
          }}>
            <style>{`
              @keyframes scaleUp {
                from { transform: scale(0.95); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
              }
            `}</style>
            
            <h3 id="tariff-change-modal-title" style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 800, fontFamily: 'Urbanist', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><circle cx="18" cy="18" r="3"/><path d="M18 16.5v1.5l1 1"/></svg>
              Tarifänderung zum neuen Monat
            </h3>
            
            <p style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: '1.4', margin: '0 0 20px 0' }}>
              Da das Abrechnungssystem für dieses Schuljahr bereits eingebucht ist, werden Tarifänderungen erst **zum 1. des nächsten Monats** wirksam. Wähle das neue Abrechnungsmodell für Schüler aus:
            </p>

            {/* Selection options inside the modal */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {[
                { id: 'option1', title: 'Option 1: Jahrespauschale', desc: '5,39 € / Jahr pro Schüler (Einmalzahlung)' },
                { id: 'option2', title: 'Option 2: Monatsumlage', desc: '0,40 € / Mo. pro Schüler (Monatlich)' }
              ].map((opt) => {
                const isSelected = selectedModalOption === opt.id;
                const isCurrentActive = studentBillingOption === opt.id;
                return (
                  <label 
                    key={opt.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '14px',
                      borderRadius: '16px',
                      border: '1.5px solid',
                      borderColor: isSelected ? '#7c3aed' : '#e2e8f0',
                      background: isSelected ? '#f5f3ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onClick={() => {
                      setSelectedModalOption(opt.id);
                    }}
                  >
                    <input 
                      type="radio" 
                      name="modal_billing_option"
                      checked={isSelected}
                      onChange={() => setSelectedModalOption(opt.id)}
                      style={{ accentColor: '#7c3aed', marginTop: '3px', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>{opt.title}</strong>
                        {isCurrentActive && <span style={{ fontSize: '0.62rem', background: '#e6f4ea', color: '#34a853', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>Aktuell aktiv</span>}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginTop: '2px' }}>{opt.desc}</span>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Dynamic Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowChangeTariffModal(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: 750,
                  cursor: 'pointer',
                  color: '#475569'
                }}
              >
                Abbrechen
              </button>
              <button 
                onClick={() => {
                  const now = new Date();
                  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                  const formatter = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
                  const effectiveDateStr = formatter.format(nextMonth);

                  setNextBillingOption(selectedModalOption);
                  setNextBillingOptionEffectiveAt(effectiveDateStr);
                  localStorage.setItem(`nextBillingOption_${schoolId}`, selectedModalOption);
                  localStorage.setItem(`nextBillingOptionEffectiveAt_${schoolId}`, effectiveDateStr);
                  setShowChangeTariffModal(false);
                }}
                disabled={selectedModalOption === studentBillingOption}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: 'none',
                  background: selectedModalOption === studentBillingOption ? '#e2e8f0' : '#7c3aed',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: selectedModalOption === studentBillingOption ? 'not-allowed' : 'pointer',
                  color: selectedModalOption === studentBillingOption ? '#94a3b8' : '#ffffff',
                  boxShadow: selectedModalOption === studentBillingOption ? 'none' : '0 2px 6px rgba(124, 58, 237, 0.15)'
                }}
              >
                Wechsel vormerken
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Active Students list for monthly invoice */}
      {activeStudentsModalList && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="active-students-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveStudentsModalList(null);
          }}
          style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            padding: '30px',
            maxWidth: '520px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            maxHeight: '80vh'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h3 id="active-students-modal-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                  Aktivierte Schüler ({activeStudentsModalList.list.length})
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                    Abrechnungsmonat: {activeStudentsModalList.month}
                  </span>
                  {activeStudentsModalList.amount !== undefined && (
                    <span style={{ fontSize: '0.74rem', color: '#0f172a', fontWeight: 800, background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                      Rechnungsbetrag: {activeStudentsModalList.amount.toFixed(2).replace('.', ',')} €
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => { setActiveStudentsModalList(null); setModalStudentSearchQuery(''); }}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontSize: '1rem',
                  fontWeight: 900
                }}
              >
                ✕
              </button>
            </div>

            {/* Live Filter inside Modal */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={modalStudentSearchQuery}
                onChange={(e) => setModalStudentSearchQuery(e.target.value)}
                placeholder="Schüler in diesem Monat filtern (Name oder Instrument)..."
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 34px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.78rem',
                  background: '#f8fafc',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }} />
              {modalStudentSearchQuery && (
                <button
                  onClick={() => setModalStudentSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: '#e2e8f0',
                    border: 'none',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    fontSize: '0.65rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#475569'
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
              {(() => {
                const qModal = modalStudentSearchQuery.trim().toLowerCase();
                const modalFilteredList = (activeStudentsModalList.list || []).filter((s: any) => {
                  if (!qModal) return true;
                  const name = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
                  const inst = (s.instrument || s.instrument_name || s.fach || '').toLowerCase();
                  return name.includes(qModal) || inst.includes(qModal);
                });

                if (modalFilteredList.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: '24px 0', fontSize: '0.84rem' }}>
                      {qModal 
                        ? `Kein Schüler gefunden für „${modalStudentSearchQuery}“.` 
                        : 'In diesem Abrechnungszeitraum wurden keine aktiven Schülerprofile abgerechnet.'}
                    </div>
                  );
                }

                return modalFilteredList.map((student: any) => {
                  const firstName = student.first_name || student.vorname || '';
                  const lastName = student.last_name || student.nachname || '';
                  const name = `${firstName} ${lastName}`.trim() || 'Schüler ohne Namen';
                  const instrument = student.instrument || student.instrument_name || student.fach || student.subject || 'Schülerprofil';
                  const isCampus = student.isCampusActive || student.is_campus_active;
                  const isGroovelab = student.isGroovelabActive || student.is_groovelab_active;
                  const dateStr = student.activated_at ? new Date(student.activated_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null;
                  return (
                    <div key={student.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.84rem', color: '#0f172a' }}>{name}</strong>
                        <span style={{ fontSize: '0.70rem', color: '#64748b' }}>{instrument}{dateStr ? ` • Aktiv seit ${dateStr}` : ''}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {student.isNewlyActivated && (
                          <span style={{ fontSize: '0.62rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #dbeafe', padding: '3px 8px', borderRadius: '100px', fontWeight: 800 }}>
                            Neu in diesem Monat
                          </span>
                        )}
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
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <button 
              onClick={() => { setActiveStudentsModalList(null); setModalStudentSearchQuery(''); }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                background: '#ea4335',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(234, 67, 53, 0.2)'
              }}
            >
              Schließen
            </button>
          </div>
        </div>
      )}

            {/* 🌟 Apple Tier-1 Enterprise Modal: Switch Billing Model (Sammelzahler vs. Eltern-Direktabrechnung) */}
      {showSwitchBillingModelModal && (() => {
        const activeCampusCount = (students || []).filter((s: any) => s.isCampusActive || s.is_campus_active).length;
        const currentMonthlyFeeForStudents = billingPayer === 'school' ? activeCampusCount * (currentSchoolProfile?.currency === 'CHF' ? 1.00 : 0.49) : 0;
        const targetMonthlyFeeForStudents = selectedSwitchTargetPayer === 'student' ? 0 : activeCampusCount * (currentSchoolProfile?.currency === 'CHF' ? 1.00 : 0.49);
        const monthlySavings = Math.max(0, currentMonthlyFeeForStudents - targetMonthlyFeeForStudents);
        const yearlySavings = monthlySavings * 12;

        const effectiveSchoolName = schoolName || currentSchoolProfile?.name || 'Musikschule';

        const isChf = currentSchoolProfile?.currency === 'CHF';
        const activeCurrency = isChf ? 'CHF' : 'EUR';
        const currencySymbol = isChf ? 'CHF' : '€';
        const studentRate = isChf ? 1.00 : 0.49;
        const schoolStartMonth = Number(currentSchoolProfile?.school_year_start_month || 9);
        const schoolStartDay = Number(currentSchoolProfile?.school_year_start_day || 1);

        const transitionInfo = calculateTransitionEffectiveDate(new Date());
        const schoolYearCalc = calculateSchoolYearDirectBilling(
          new Date(),
          activeCurrency,
          studentRate,
          schoolStartMonth,
          schoolStartDay,
          transitionInfo.effectiveDateIso
        );

        const handleDownloadParentLetterPdf = async () => {
          try {
            const { default: jsPDF } = await import('jspdf');
            const doc = new jsPDF('p', 'mm', 'a4');

            doc.setFillColor(248, 250, 252);
            doc.rect(0, 0, 210, 297, 'F');

            doc.setFillColor(52, 168, 83);
            doc.roundedRect(15, 15, 180, 28, 4, 4, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Campus-Groovelab • Elterninformation', 22, 28);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Information zur Freischaltung des Campus-Moduls • ${effectiveSchoolName}`, 22, 36);

            doc.setFillColor(255, 255, 255);
            doc.roundedRect(15, 50, 180, 225, 4, 4, 'F');
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(15, 50, 180, 225, 4, 4, 'S');

            doc.setTextColor(15, 23, 42);
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.text('Liebe Eltern, liebe Schülerinnen und Schüler,', 22, 65);

            doc.setFontSize(9.2);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(51, 65, 85);
            
            const currencySymbol = isChf ? 'CHF' : '€';
            const lines = [
              'unsere Musikschule nutzt die innovative Plattform Campus-Groovelab für den digitalen Unterricht,',
              'das interaktive Hausaufgabenheft, Übe-Timer, Loopstation und Unterrichtsaufnahmen.',
              '',
              'Zur Deckung der individuellen Bereitstellungskosten stellen wir für das laufende Schuljahr auf',
              'das Modell der fairen Eltern-Direktabrechnung mit dynamischer Restzeitberechnung um.',
              '',
              'Die wichtigsten Eckdaten für Sie im Überblick:',
              `• Voll finanzierte Übergangsphase: Der laufende Monat (${transitionInfo.currentMonthName}) und der Folgemonat (${transitionInfo.bufferMonthName}) werden zu 100% von der Musikschule übernommen. Ihr Kind übt unterbrechungsfrei weiter!`,
              `• Bezahlter Zeitraum ab ${transitionInfo.effectiveDateFormatted}: Einmaliger Restschuljahres-Beitrag von nur ${schoolYearCalc.totalAmountStr} ${currencySymbol} (für ${schoolYearCalc.remainingPaidMonths} verbleibende Restmonate bis zum Schuljahresende am 31. August).`,
              '• Dynamische Restzeit: Sie zahlen immer nur die tatsächlich verbleibenden Monate bis zum Schuljahresende (kein 12-Monats-Zwang).',
              '• Kein Abo & keine Verlängerung: Einmalige Schuljahresgebühr • endet automatisch zum Schuljahresende.',
              '• GrooveLab-Vorteil: Band-Rooms, Repertoire & Songs bleiben für Ihr Kind 100% kostenfrei (Schule übernimmt).',
              '• 100% Datenschutz: Keine Speicherung von Bankdaten Minderjähriger (DSGVO/COPPA-konform).',
              '',
              'So schalten Sie den Zugang für Ihr Kind frei:',
              '1. Öffnen Sie die Campus-Groovelab App auf dem Smartphone oder Tablet Ihres Kindes.',
              '2. Klicken Sie im oberen Bereich auf „Jahresbeitrag für Eltern freischalten“.',
              '3. Scannen Sie den vorausgefüllten EPC-GiroCode mit Ihrer Banking-App (z. B. Sparkasse, VR, ING, N26, PostFinance).',
              '4. Nach der Überweisung ist der Zugang dauerhaft für das gesamte Schuljahr freigeschaltet.',
              '',
              'Härtefall-Regelung & Geschwisterrabatt:',
              'Familien mit mehreren Kindern oder in besonderen Lebenslagen können sich vertrauensvoll an unser',
              'Schulsekretariat wenden – die Musikschule kann das Profil unbürokratisch freistellen.',
              '',
              'Herzliche Grüße,',
              `${effectiveSchoolName} • Schulleitung & Lehrkräfte-Team`
            ];

            let y = 76;
            lines.forEach(line => {
              if (line.startsWith('•') || line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.') || line.startsWith('4.')) {
                doc.setFont('helvetica', 'bold');
                doc.text(line, 22, y);
                doc.setFont('helvetica', 'normal');
              } else if (line.startsWith('Die wichtigsten') || line.startsWith('So schalten') || line.startsWith('Härtefall-')) {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text(line, 22, y);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(51, 65, 85);
              } else {
                doc.text(line, 22, y);
              }
              y += 5.8;
            });

            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            doc.text('Campus-Groovelab • Transparentes Cloud-Hosting statt teurer Software-Lizenzen (0,00 € Software-Bereitstellung).', 22, 266);

            doc.save(`Elternbrief_Campus_Direktabrechnung_${effectiveSchoolName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
          } catch (e: any) {
            alert('Fehler beim PDF-Export: ' + e.message);
          }
        };

        const handleConfirmSwitchBillingModel = async () => {
          try {
            setIsSwitchingPayer(true);
            const targetPayer = selectedSwitchTargetPayer;
            const targetOption = targetPayer === 'student' ? 'student_full' : 'option2';
            
            const updates: any = {
              billing_payer: targetPayer,
              student_billing_option: targetOption,
              direct_billing_effective_date: targetPayer === 'student' ? transitionInfo.effectiveDateIso : null,
              direct_billing_switched_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            const { error } = await supabase
              .from('schools')
              .update(updates)
              .eq('id', schoolId);

            if (error) throw error;

            // Instant 0-Day Full Coverage: If switching to Sammelzahler, immediately activate all passive students
            if (targetPayer === 'school') {
              const passiveIds = (students || []).filter((s: any) => !s.is_campus_active).map((s: any) => s.id);
              if (passiveIds.length > 0) {
                try {
                  await supabase
                    .from('users')
                    .update({ is_campus_active: true, status: 'active', payment_status: 'active', updated_at: new Date().toISOString() })
                    .in('id', passiveIds);
                  await supabase
                    .from('users')
                    .update({ is_campus_active: true, status: 'active', payment_status: 'active', updated_at: new Date().toISOString() })
                    .in('id', passiveIds);
                } catch (e) {
                  console.warn('Instant student activation notice:', e);
                }
              }
            }

            try {
              const overridesStr = localStorage.getItem('groovelab_school_overrides') || localStorage.getItem('campus_school_overrides');
              const overrides = overridesStr ? JSON.parse(overridesStr) : {};
              overrides[schoolId] = {
                ...(overrides[schoolId] || {}),
                billing_payer: targetPayer,
                student_billing_option: targetOption,
                direct_billing_effective_date: updates.direct_billing_effective_date
              };
              localStorage.setItem('groovelab_school_overrides', JSON.stringify(overrides));
              localStorage.setItem('campus_school_overrides', JSON.stringify(overrides));
            } catch (e) {}

            setBillingPayer(targetPayer);
            setStudentBillingOption(targetOption);
            setShowSwitchBillingModelModal(false);
            await fetchDashboardData();
            alert(targetPayer === 'student' 
              ? `Erfolgreich umgestellt! Deine Musikschule finanziert den ${transitionInfo.currentMonthName} und den ${transitionInfo.bufferMonthName} als Puffer-Übergangsmonat (0,49 € / Schüler). Ab dem ${transitionInfo.effectiveDateFormatted} greift die Eltern-Direktabrechnung mit nur ${schoolYearCalc.totalAmountStr} € Restschuljahresbeitrag pro Schüler.`
              : 'Erfolgreich umgestellt! Deine Musikschule übernimmt ab sofort alle Schülerkosten als Sammelzahler (0 Tage Frist • sofortige Vollfreischaltung aller Schüler).');
          } catch (err: any) {
            alert('Fehler beim Modellwechsel: ' + err.message);
          } finally {
            setIsSwitchingPayer(false);
          }
        };

        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="switch-billing-title"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              padding: '20px'
            }}
            onClick={() => setShowSwitchBillingModelModal(false)}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '680px',
                padding: '28px 32px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                maxHeight: '92vh',
                overflowY: 'auto'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '0.68rem', background: '#e0e7ff', color: '#4338ca', padding: '3px 10px', borderRadius: '999px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Enterprise Abrechnungs-Modell
                  </span>
                  <h3 id="switch-billing-title" style={{ margin: '8px 0 2px 0', fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                    Abrechnungsmodell für Schüler-Aktivierungen anpassen
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4 }}>
                    Wechsle flexibel zwischen Musikschul-Sammelabrechnung und Eltern-Direktabrechnung mit voll finanzierter 2-Monats-Übergangsphase für unterbrechungsfreien Unterricht.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSwitchBillingModelModal(false)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* 2-Option Cards Selector */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {/* Option 1: Eltern-Direktabrechnung */}
                <div
                  onClick={() => setSelectedSwitchTargetPayer('student')}
                  style={{
                    border: '2px solid',
                    borderColor: selectedSwitchTargetPayer === 'student' ? '#0284c7' : '#e2e8f0',
                    background: selectedSwitchTargetPayer === 'student' ? '#f0f9ff' : '#ffffff',
                    borderRadius: '18px',
                    padding: '18px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'all 0.15s ease',
                    boxShadow: selectedSwitchTargetPayer === 'student' ? '0 8px 20px rgba(2, 132, 199, 0.12)' : 'none'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '6px' }}>
                          🌟 Empfohlen
                        </span>
                        {billingPayer === 'student' && (
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px' }}>
                            ● Aktuell aktiv
                          </span>
                        )}
                      </div>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid', borderColor: selectedSwitchTargetPayer === 'student' ? '#0284c7' : '#cbd5e1', background: selectedSwitchTargetPayer === 'student' ? '#0284c7' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '0.72rem', fontWeight: 800 }}>
                        {selectedSwitchTargetPayer === 'student' && '✓'}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                      Eltern-Direktabrechnung
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#0284c7', fontWeight: 700, margin: '2px 0 6px 0' }}>
                      {schoolYearCalc.totalAmountStr} {currencySymbol} Restschuljahres-Beitrag ({studentRate.toFixed(2).replace('.', ',')} {currencySymbol} / Mo.)
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.72rem', color: '#475569', lineHeight: 1.5 }}>
                      <li>Ab <strong>{transitionInfo.effectiveDateFormatted}</strong>: Schulkosten sinken auf <strong>0,00 € pro aktiven Schüler</strong></li>
                      <li>Puffer-Garantie: Musikschule finanziert <strong>{transitionInfo.currentMonthName} &amp; {transitionInfo.bufferMonthName}</strong> vollständig</li>
                      <li>Kein Abo &amp; keine Verlängerung: Einmalbeitrag bis 31. August</li>
                    </ul>
                  </div>
                </div>

                {/* Option 2: Sammelzahler */}
                <div
                  onClick={() => setSelectedSwitchTargetPayer('school')}
                  style={{
                    border: '2px solid',
                    borderColor: selectedSwitchTargetPayer === 'school' ? '#7e22ce' : '#e2e8f0',
                    background: selectedSwitchTargetPayer === 'school' ? '#faf5ff' : '#ffffff',
                    borderRadius: '18px',
                    padding: '18px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'all 0.15s ease',
                    boxShadow: selectedSwitchTargetPayer === 'school' ? '0 8px 20px rgba(126, 34, 206, 0.12)' : 'none'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#f3e8ff', color: '#6b21a8', padding: '2px 8px', borderRadius: '6px' }}>
                          🏫 Sammelzahler
                        </span>
                        {billingPayer === 'school' && (
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px' }}>
                            ● Aktuell aktiv
                          </span>
                        )}
                      </div>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid', borderColor: selectedSwitchTargetPayer === 'school' ? '#7e22ce' : '#cbd5e1', background: selectedSwitchTargetPayer === 'school' ? '#7e22ce' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '0.72rem', fontWeight: 800 }}>
                        {selectedSwitchTargetPayer === 'school' && '✓'}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                      Musikschule übernimmt
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#7e22ce', fontWeight: 700, margin: '2px 0 6px 0' }}>
                      {studentRate.toFixed(2).replace('.', ',')} {currencySymbol} / Schüler / Mo. auf Sammelrechnung
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.72rem', color: '#475569', lineHeight: 1.5 }}>
                      <li>100% kostenlos für alle Eltern &amp; Schüler</li>
                      <li>Schule trägt alle Modul-Aktivierungen</li>
                      <li>Keine Einzelüberweisung der Eltern nötig</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Notice when current tariff is already selected */}
              {selectedSwitchTargetPayer === billingPayer && (
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.78rem',
                  color: '#475569',
                  lineHeight: 1.45
                }}>
                  <span style={{ fontSize: '1rem' }}>ℹ️</span>
                  <span>
                    <strong>{billingPayer === 'school' ? 'Musikschule übernimmt (Sammelzahler)' : 'Eltern-Direktabrechnung'}</strong> ist derzeit aktiv. Klicke auf die andere Option, um das Abrechnungsmodell umzustellen.
                  </span>
                </div>
              )}

              {/* Live Savings Calculator Banner (when switching from school to student) */}
              {selectedSwitchTargetPayer === 'student' && billingPayer === 'school' && (
                <div style={{
                  background: 'linear-gradient(135deg, #ecfdf5 0%, #dcfce7 100%)',
                  border: '1.5px solid #86efac',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      💰 Deine monatliche Kostenersparnis ab {transitionInfo.effectiveDateFormatted}
                    </span>
                    <div style={{ fontSize: '0.86rem', color: '#14532d', fontWeight: 700, marginTop: '2px' }}>
                      {activeCampusCount} aktive Schüler: 0,00 € Schulkosten ab Stichtag statt {(activeCampusCount * studentRate).toFixed(2).replace('.', ',')} {currencySymbol} / Mo.
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#15803d', marginTop: '2px' }}>
                      Eltern übernehmen die Bereitstellung direkt • Musikschule spart 100% der Schüler-Aktivierungsgebühr.
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#047857' }}>
                      -{monthlySavings.toFixed(2).replace('.', ',')} {currencySymbol} / Mo.
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 700 }}>
                      (-{yearlySavings.toFixed(2).replace('.', ',')} {currencySymbol} / Jahr)
                    </span>
                  </div>
                </div>
              )}

              {/* 2-Month Buffer Period Guarantee Badge (when switching from school to student) */}
              {selectedSwitchTargetPayer === 'student' && billingPayer === 'school' && (
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  fontSize: '0.76rem',
                  color: '#334155',
                  lineHeight: 1.4
                }}>
                  <ShieldCheck size={18} color="#10b981" style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>
                    <strong>2-Monats-Puffer-Garantie:</strong> Kein Unterrichtsausfall! Deine Musikschule finanziert den laufenden Monat ({transitionInfo.currentMonthName}) sowie den gesamten Folgemonat ({transitionInfo.bufferMonthName}) als Übergangsphase zu 100%. Ab dem {transitionInfo.effectiveDateFormatted} greift die faire Eltern-Direktabrechnung mit nur {schoolYearCalc.totalAmountStr} {currencySymbol} Restschuljahresbeitrag.
                  </span>
                </div>
              )}

              {/* Notice when switching from student to school */}
              {selectedSwitchTargetPayer === 'school' && billingPayer === 'student' && (
                <div style={{
                  background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
                  border: '1.5px solid #d8b4fe',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '0.82rem',
                  color: '#581c87',
                  lineHeight: 1.4
                }}>
                  <Sparkles size={20} color="#7e22ce" style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Sofortige Vollfreischaltung aller Schüler:</strong> Deine Musikschule übernimmt ab sofort alle Schülerkosten auf die monatliche Schulsammelrechnung ({studentRate.toFixed(2).replace('.', ',')} {currencySymbol} / Schüler / Mo.). Alle Schülerprofile werden sofort und ohne Wartezeit voll aktiviert.
                  </span>
                </div>
              )}

              {/* Action Buttons & Parent Letter Download */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: selectedSwitchTargetPayer === 'student' ? '1.2fr 1fr' : '1fr', gap: '10px' }}>
                  {/* Confirm CTA */}
                  <button
                    type="button"
                    disabled={isSwitchingPayer || selectedSwitchTargetPayer === billingPayer}
                    onClick={handleConfirmSwitchBillingModel}
                    style={{
                      background: selectedSwitchTargetPayer === billingPayer 
                        ? '#e2e8f0' 
                        : (selectedSwitchTargetPayer === 'student' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'linear-gradient(135deg, #7e22ce 0%, #6b21a8 100%)'),
                      color: selectedSwitchTargetPayer === billingPayer ? '#94a3b8' : '#ffffff',
                      border: 'none',
                      borderRadius: '14px',
                      padding: '13px 18px',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      cursor: (isSwitchingPayer || selectedSwitchTargetPayer === billingPayer) ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: selectedSwitchTargetPayer !== billingPayer ? '0 6px 18px rgba(2, 132, 199, 0.3)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isSwitchingPayer 
                      ? 'Wird umgestellt...' 
                      : selectedSwitchTargetPayer === billingPayer 
                        ? '✓ Aktuelles Modell ist bereits aktiv' 
                        : `Wechsel zu ${selectedSwitchTargetPayer === 'student' ? 'Eltern-Direktabrechnung' : 'Musikschul-Sammelabrechnung'} bestätigen ➔`}
                  </button>

                  {/* Sample Parent Letter */}
                  <button
                    type="button"
                    onClick={handleDownloadParentLetterPdf}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '14px',
                      padding: '13px 14px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = '#0f172a'; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; }}
                  >
                    <Download size={15} />
                    <span>Muster-Elternbrief (PDF)</span>
                  </button>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                    Campus-Groovelab • Flexible SaaS-Vertragsanpassung ohne Kündigungsfristen oder Einrichtungsgebühren.
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}


      {/* Modal for Standalone Storage Upgrade/Downgrade */}
      {showStorageManagerModal && (() => {
        const activeBookedGb = Number(currentSchoolProfile?.storage_addon_gb || 0);
        const activeBookedFee = Number(currentSchoolProfile?.storage_addon_monthly_fee ?? (activeBookedGb === 5 ? 1.49 : activeBookedGb === 10 ? 1.99 : activeBookedGb === 20 ? 3.99 : activeBookedGb === 25 ? 3.99 : activeBookedGb === 50 ? 6.99 : activeBookedGb === 100 ? 11.99 : activeBookedGb === 250 ? 24.99 : 0));
        const feeDelta = selectedStorageAddonFee - activeBookedFee;
        const usedBytes = getEffectiveStorageUsedBytes(currentSchoolProfile);
        const usedGb = usedBytes / (1024 * 1024 * 1024);
        const usedMb = usedBytes / (1024 * 1024);
        const baseGb = 1.0;
        const currentTotalCap = baseGb + activeBookedGb;
        const usagePct = Math.min(100, Math.round((usedGb / currentTotalCap) * 100));
        const formattedUsed = usedBytes <= 0 
          ? '0,0 MB' 
          : usedGb < 1.0 
            ? `${usedMb.toFixed(1).replace('.', ',')} MB` 
            : `${usedGb.toFixed(2).replace('.', ',')} GB`;
        const formattedPct = usedBytes > 0 && usagePct < 1 ? '< 1%' : `${usagePct}%`;

        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="storage-manager-title"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              padding: '20px'
            }}
            onClick={() => setShowStorageManagerModal(false)}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '640px',
                padding: '28px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '0.65rem', background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '999px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Cloud-Speicher Self-Service
                  </span>
                  <h3 id="storage-manager-title" style={{ margin: '6px 0 2px 0', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                    Audio-Tresor Speicher anpassen
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                    Wähle dein gewünschtes Speichervolumen. Upgrades sind sofort aktiv, Downgrades werden monatlich wirksam.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Dialog schließen"
                  onClick={() => setShowStorageManagerModal(false)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} color="#64748b" />
                </button>
              </div>

              {/* Usage Meter */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                  <span style={{ fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <HardDrive size={15} color="#34a853" /> Aktuelle Speicherbelegung:
                  </span>
                  <span style={{ fontWeight: 700, color: usagePct > 80 ? '#dc2626' : '#16a34a' }}>
                    {formattedUsed} von {currentTotalCap} GB belegt ({formattedPct})
                  </span>
                </div>
                <div style={{ background: '#e2e8f0', borderRadius: '6px', height: '6px', overflow: 'hidden', width: '100%' }}>
                  <div style={{
                    height: '100%',
                    width: `${usedBytes > 0 ? Math.max(5, (usedGb / currentTotalCap) * 100) : 0}%`,
                    background: usagePct > 80 ? '#ef4444' : 'linear-gradient(90deg, #34a853 0%, #10b981 100%)',
                    borderRadius: '6px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>

              {/* Tier Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
                {(masterPricing.storageTiers || DEFAULT_STORAGE_TIERS).map((tier: StorageTier) => {
                  const isSel = selectedStorageAddonGb === tier.gb;
                  const isCurrent = activeBookedGb === tier.gb;
                  const tierCapGb = baseGb + tier.gb;
                  const isDowngradeBlocked = usedGb > tierCapGb;
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
                  const Icon = iconMapping[tier.gb] || Sparkles;

                  return (
                    <div
                      key={tier.gb}
                      onClick={() => {
                        setSelectedStorageAddonGb(tier.gb);
                        setSelectedStorageAddonFee(tier.price);
                      }}
                      style={{
                        padding: '14px 10px',
                        borderRadius: '16px',
                        border: '2px solid',
                        borderColor: isSel ? '#34a853' : isCurrent ? '#a7f3d0' : '#e2e8f0',
                        background: isSel ? '#f0fdf4' : isCurrent ? '#fafffd' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        position: 'relative',
                        transition: 'all 0.2s'
                      }}
                    >
                      {isCurrent && (
                        <span style={{
                          position: 'absolute',
                          top: '-8px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: '#34a853',
                          color: '#ffffff',
                          fontSize: '0.54rem',
                          fontWeight: 900,
                          padding: '1px 6px',
                          borderRadius: '999px',
                          textTransform: 'uppercase'
                        }}>
                          Aktiv
                        </span>
                      )}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: isSel ? '#dcfce7' : '#f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Icon size={16} color={isSel ? '#166534' : '#64748b'} />
                          </div>
                        </div>
                        <div style={{ fontWeight: 900, fontSize: '0.86rem', color: isSel ? '#166534' : '#0f172a' }}>{tier.label}</div>
                        <div style={{ fontSize: '0.62rem', color: isSel ? '#15803d' : '#64748b', fontWeight: 600, marginTop: '2px' }}>{tier.sublabel}</div>
                      </div>
                      <div style={{
                        borderTop: '1px solid #e2e8f0',
                        paddingTop: '6px',
                        marginTop: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px'
                      }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: isSel ? '#34a853' : '#0f172a' }}>
                          {tier.price > 0 ? `${tier.price.toFixed(2).replace('.', ',')} € / Mo.` : '0,00 €'}
                        </span>
                        <span style={{ fontSize: '0.56rem', color: isSel ? '#166534' : '#64748b', fontWeight: 600 }}>
                          {tier.price > 0 ? 'netto zzgl. USt.' : 'Inklusive'}
                        </span>
                        {isCurrent ? (
                          <span style={{ fontSize: '0.52rem', color: '#16a34a', fontWeight: 800, marginTop: '2px' }}>
                            (Aktuelles Paket)
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '0.52rem',
                            fontWeight: 800,
                            marginTop: '2px',
                            color: tier.price > activeBookedFee ? '#16a34a' : (tier.price < activeBookedFee ? '#b45309' : '#64748b')
                          }}>
                            {tier.price > activeBookedFee 
                              ? `+${(tier.price - activeBookedFee).toFixed(2).replace('.', ',')} € / Mo.` 
                              : (tier.price < activeBookedFee 
                                ? `${(tier.price - activeBookedFee).toFixed(2).replace('.', ',')} € / Mo.` 
                                : '0,00 €')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 📢 Storage Termination & Grace Period Option */}
              {usedGb > 1.0 && (
                <div style={{
                  background: '#f8fafc',
                  border: '1.5px dashed #cbd5e1',
                  borderRadius: '16px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>📦</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.78rem', color: '#0f172a' }}>
                        Möchtest du den Audio-Tresor kündigen (0,00 €)?
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                        Starte eine faire Download-Frist, damit Schüler ihre Aufnahmen als ZIP sichern können.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowStorageManagerModal(false);
                      setShowStorageTerminationModal(true);
                    }}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '10px',
                      padding: '7px 12px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                    }}
                  >
                    📢 Kündigung mit Schüler-Frist
                  </button>
                </div>
              )}

              {/* Active Pending Downgrade Notification & Cancellation */}
              {currentSchoolProfile?.storage_pending_downgrade_gb !== null && currentSchoolProfile?.storage_pending_downgrade_gb !== undefined && (
                <div style={{
                  background: '#fffbeb',
                  border: '1.5px solid #fde68a',
                  borderRadius: '16px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.3rem' }}>⏳</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#92400e' }}>
                        Speicher-Reduzierung vorgemerkt zum {currentSchoolProfile?.storage_pending_effective_date}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#b45309' }}>
                        Ziel-Paket: {currentSchoolProfile?.storage_pending_downgrade_gb > 0 ? `+${currentSchoolProfile?.storage_pending_downgrade_gb} GB` : 'Standard (1 GB Basis)'}. Bis zum Stichtag bleibt dein aktuelles Paket (+{currentSchoolProfile?.storage_addon_gb} GB) voll aktiv.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm('Möchtest du die vorgemerkte Speicher-Reduzierung widerrufen und dein aktuelles Speicher-Paket unverändert beibehalten?')) return;
                      try {
                        const targetId = schoolId || currentSchoolProfile?.id;
                        const { data: cancelRes, error: cancelErr } = await supabase.rpc('book_school_tariff_plan', {
                          p_school_id: targetId,
                          p_has_campus: hasCampusSub,
                          p_has_groovelab: hasGroovelabSub,
                          p_student_billing_option: studentBillingOption,
                          p_storage_addon_gb: currentSchoolProfile?.storage_addon_gb || 0,
                          p_storage_addon_monthly_fee: currentSchoolProfile?.storage_addon_monthly_fee || 0,
                          p_booking_type: 'STORAGE_DOWNGRADE_CANCEL',
                          p_notes: 'Widerruf der vorgemerkten Speicher-Reduzierung durch Schulleitung'
                        });
                        if (cancelErr) throw cancelErr;
                        await fetchDashboardData();
                        if (fetchTariffBookings) await fetchTariffBookings();
                        setShowStorageManagerModal(false);
                        alert('✅ Speicher-Reduzierung erfolgreich widerrufen. Dein Paket bleibt unverändert aktiv.');
                      } catch (err: any) {
                        alert('Fehler beim Widerrufen: ' + err.message);
                      }
                    }}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #d97706',
                      borderRadius: '10px',
                      padding: '8px 14px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      color: '#b45309',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 6px rgba(217, 119, 6, 0.1)'
                    }}
                  >
                    Widerrufen
                  </button>
                </div>
              )}

              {/* Downgrade Notice Info Box */}
              {selectedStorageAddonGb < activeBookedGb && (
                <div style={{
                  background: '#fefce8',
                  border: '1.5px solid #fef08a',
                  borderRadius: '16px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
                  <div style={{ fontSize: '0.74rem', color: '#854d0e', lineHeight: 1.45 }}>
                    <div style={{ fontWeight: 800, marginBottom: '2px', color: '#713f12' }}>
                      Vorgemerkte Reduzierung zum Monatsende
                    </div>
                    {usedGb > (baseGb + selectedStorageAddonGb) ? (
                      <span>
                        ⚠️ <strong>Frist zur Datenbereinigung:</strong> Dein aktuell belegter Speicher ({usedGb.toFixed(2).replace('.', ',')} GB) übersteigt das Zielpaket ({baseGb + selectedStorageAddonGb} GB). Der Wechsel wird zum Ende des Abrechnungsmonats vorgemerkt. Bis zum Stichtag bleiben alle bestehenden Aufnahmen 100% geschützt abrufbar. Bitte bereinige bis zum Stichtag nicht mehr benötigte Aufnahmen im Audio-Tresor, da bei Überschreitung ab dem Stichtag ein Upload-Stopp für neue Aufnahmen greift.
                      </span>
                    ) : (
                      <span>
                        Dein aktueller Datenbestand ({usedGb.toFixed(2).replace('.', ',')} GB) passt problemlos in das neue Kontingent ({baseGb + selectedStorageAddonGb} GB). Der Wechsel wird zum Ende des laufenden Monats wirksam. Bis zum Stichtag nutzt du weiterhin dein volles bisheriges Kontingent.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Security & Compliance Box in Modal */}
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '0.7rem',
                color: '#475569'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0f172a', fontWeight: 800 }}>
                  <ShieldCheck size={15} color="#34a853" />
                  <span>DSGVO- &amp; Sicherheitsstandards (ISO 27001, AES-256, Art. 17 DSGVO Physisch-Löschung)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px', fontSize: '0.66rem', color: '#64748b' }}>
                  <span>✓ 100% Hosting in Deutschland</span>
                  <span>✓ AES-256 Server-Verschlüsselung</span>
                  <span>✓ Tägliche Sicherheits-Backups</span>
                  <span>✓ Sofortige physische Speicherfreigabe</span>
                </div>
              </div>

              {/* 📋 Gesetzliche Vorab-Zusammenfassung & Bestellübersicht (§ 312j BGB) */}
              <div style={{
                background: selectedStorageAddonGb > activeBookedGb ? '#f0fdf4' : (selectedStorageAddonGb < activeBookedGb ? '#fefce8' : '#f8fafc'),
                border: '1.5px solid',
                borderColor: selectedStorageAddonGb > activeBookedGb ? '#86efac' : (selectedStorageAddonGb < activeBookedGb ? '#fde047' : '#e2e8f0'),
                borderRadius: '16px',
                padding: '14px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={15} color={selectedStorageAddonGb > activeBookedGb ? '#16a34a' : (selectedStorageAddonGb < activeBookedGb ? '#d97706' : '#64748b')} />
                    {selectedStorageAddonGb > activeBookedGb 
                      ? 'Bestellübersicht: Sofortiges Speicher-Upgrade' 
                      : (selectedStorageAddonGb < activeBookedGb 
                        ? 'Tarifänderung: Vorgemerkte Speicher-Reduzierung' 
                        : 'Ausgewähltes Kontingent (Unverändert)')}
                  </span>
                  <span style={{
                    fontSize: '0.64rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: selectedStorageAddonGb > activeBookedGb ? '#dcfce7' : (selectedStorageAddonGb < activeBookedGb ? '#fef3c7' : '#e2e8f0'),
                    color: selectedStorageAddonGb > activeBookedGb ? '#166534' : (selectedStorageAddonGb < activeBookedGb ? '#92400e' : '#475569')
                  }}>
                    {selectedStorageAddonGb > activeBookedGb ? 'Sofortige Freischaltung' : (selectedStorageAddonGb < activeBookedGb ? 'Wirksam zum Monatsende' : 'Bereits aktiv')}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', fontSize: '0.72rem', color: '#334155' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.65rem', display: 'block' }}>Gewähltes Kontingent:</span>
                    <strong style={{ color: '#0f172a' }}>{selectedStorageAddonGb > 0 ? `+${selectedStorageAddonGb} GB` : 'Standard (1 GB Basis)'}</strong>
                    <span style={{ color: '#64748b', fontSize: '0.62rem', marginLeft: '4px' }}>({(1.0 + selectedStorageAddonGb).toFixed(0)} GB Gesamtspeicher)</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.65rem', display: 'block' }}>Neuer Tarifbetrag:</span>
                    <strong style={{ color: '#0f172a' }}>{selectedStorageAddonFee.toFixed(2).replace('.', ',')} € / Mo. netto</strong>
                    <span style={{ color: '#64748b', fontSize: '0.62rem', marginLeft: '4px' }}>({(selectedStorageAddonFee * 1.19).toFixed(2).replace('.', ',')} € brutto)</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.65rem', display: 'block' }}>Kosten-Delta:</span>
                    <strong style={{ color: feeDelta > 0 ? '#16a34a' : (feeDelta < 0 ? '#b45309' : '#64748b') }}>
                      {feeDelta > 0 
                        ? `+${feeDelta.toFixed(2).replace('.', ',')} € / Mo. netto` 
                        : (feeDelta < 0 
                          ? `${feeDelta.toFixed(2).replace('.', ',')} € / Mo. Ersparnis` 
                          : '0,00 € (Keine Änderung)')}
                    </strong>
                  </div>
                </div>

                {/* Special Trial Notice Badge if School is in Free Trial */}
                {(currentSchoolProfile?.is_trial || currentSchoolProfile?.status === 'trial') && selectedStorageAddonGb > activeBookedGb && (
                  <div style={{
                    background: 'linear-gradient(90deg, #fefce8 0%, #fef9c3 100%)',
                    border: '1.5px solid #fde047',
                    borderRadius: '14px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    boxShadow: '0 2px 8px rgba(202, 138, 4, 0.08)'
                  }}>
                    <Sparkles size={20} color="#ca8a04" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '0.75rem', color: '#854d0e', lineHeight: 1.45 }}>
                      <strong style={{ display: 'block', color: '#713f12', fontWeight: 850, fontSize: '0.80rem', marginBottom: '2px' }}>
                        ✨ Probemonats-Vorteil: 0,00 € im laufenden Testmonat
                      </strong>
                      Für deinen verbleibenden Probemonat stellen wir dir das Zusatzvolumen <strong>vollständig kostenfrei (0,00 €)</strong> bereit. Nach Ablauf der 30 Tage Testphase geht das Paket für faire {selectedStorageAddonFee.toFixed(2).replace('.', ',')} € / Mo. netto in deinen regulären Schultarif über (jederzeit flexibel zum Monatsende kündbar).
                    </div>
                  </div>
                )}

                <div style={{ fontSize: '0.63rem', color: '#64748b', borderTop: '1px solid', borderColor: selectedStorageAddonGb > activeBookedGb ? '#dcfce7' : (selectedStorageAddonGb < activeBookedGb ? '#fef9c3' : '#f1f5f9'), paddingTop: '6px' }}>
                  Vertragspartner: {schoolName || 'Musikschule'} (B2B). Monatlich flexibel anpassbar. Revisionssicherer Beleg wird unmittelbar im Buchungsjournal hinterlegt.
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                  {selectedStorageAddonGb === activeBookedGb 
                    ? 'Wähle ein anderes Kontingent aus, um eine Änderung vorzunehmen.' 
                    : (selectedStorageAddonGb > activeBookedGb 
                      ? ((currentSchoolProfile?.is_trial || currentSchoolProfile?.status === 'trial')
                          ? 'Sofortige Bereitstellung: 0,00 € bis zum Ende deines Probemonats.'
                          : 'Rechnungsstellung erfolgt monatlich mit der Schulsammelrechnung.') 
                      : 'Bis zum Monatsletzten bleibt dein volles bisheriges Kontingent erhalten.')}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    disabled={isSubmittingStorage}
                    onClick={() => setShowStorageManagerModal(false)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      fontSize: '0.78rem',
                      fontWeight: 750,
                      cursor: isSubmittingStorage ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingStorage || selectedStorageAddonGb === activeBookedGb}
                    onClick={async () => {
                      if (selectedStorageAddonGb === activeBookedGb) return;
                      setIsSubmittingStorage(true);
                      try {
                        const targetId = schoolId || currentSchoolProfile?.id;
                        const activeBookedGb = Number(currentSchoolProfile?.storage_addon_gb || 0);
                        const isDowngrade = selectedStorageAddonGb < activeBookedGb;
                        const isUpgrade = selectedStorageAddonGb > activeBookedGb;
                        const bookingType = isUpgrade
                          ? 'STORAGE_UPGRADE'
                          : (isDowngrade ? (selectedStorageAddonGb === 0 ? 'STORAGE_CANCEL' : 'STORAGE_DOWNGRADE') : 'STORAGE_UPDATE');

                        const { data: rpcRes, error: rpcErr } = await supabase.rpc('book_school_tariff_plan', {
                          p_school_id: targetId,
                          p_has_campus: hasCampusSub,
                          p_has_groovelab: hasGroovelabSub,
                          p_student_billing_option: studentBillingOption,
                          p_storage_addon_gb: selectedStorageAddonGb,
                          p_storage_addon_monthly_fee: selectedStorageAddonFee,
                          p_booking_type: bookingType,
                          p_notes: isUpgrade
                            ? `Sofortige Speichererweiterung auf +${selectedStorageAddonGb} GB (${selectedStorageAddonFee.toFixed(2).replace('.', ',')} € / Mo. netto)`
                            : `Vorgemerkte Speicherreduzierung auf ${selectedStorageAddonGb > 0 ? `+${selectedStorageAddonGb} GB` : 'Standard (1 GB Basis)'}`
                        });

                        if (rpcErr) throw rpcErr;

                        if (typeof window !== 'undefined') {
                          localStorage.setItem(`groovelab_storage_addon_gb_${targetId}`, String(selectedStorageAddonGb));
                          localStorage.setItem(`campus_storage_addon_gb_${targetId}`, String(selectedStorageAddonGb));
                          localStorage.setItem('groovelab_storage_addon_gb', String(selectedStorageAddonGb));
                          localStorage.setItem('campus_storage_addon_gb', String(selectedStorageAddonGb));
                          localStorage.setItem('groovelab_storage_addon_active', selectedStorageAddonGb > 0 ? 'true' : 'false');
                          localStorage.setItem('campus_storage_addon_active', selectedStorageAddonGb > 0 ? 'true' : 'false');
                          window.dispatchEvent(new Event('groovelab_school_updated'));
                        }

                        await fetchDashboardData();
                        if (fetchTariffBookings) await fetchTariffBookings();
                        setShowStorageManagerModal(false);

                        // Trigger world-class enterprise receipt confirmation modal
                        setStorageBookingSuccessModal({
                          isOpen: true,
                          receiptNumber: rpcRes?.receipt_number || `TB-${(targetId || '').substring(0, 6).toUpperCase()}-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`,
                          newGb: selectedStorageAddonGb,
                          newFee: selectedStorageAddonFee,
                          isDowngrade,
                          effectiveDate: rpcRes?.storage_pending_effective_date
                        });
                      } catch (err: any) {
                        alert("Fehler beim Speichern: " + err.message);
                      } finally {
                        setIsSubmittingStorage(false);
                      }
                    }}
                    style={{
                      padding: '11px 22px',
                      borderRadius: '12px',
                      border: 'none',
                      background: selectedStorageAddonGb === activeBookedGb 
                        ? '#cbd5e1' 
                        : (selectedStorageAddonGb > activeBookedGb ? '#34a853' : '#d97706'),
                      color: '#ffffff',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: (isSubmittingStorage || selectedStorageAddonGb === activeBookedGb) ? 'not-allowed' : 'pointer',
                      boxShadow: selectedStorageAddonGb === activeBookedGb ? 'none' : '0 4px 14px rgba(52, 168, 83, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isSubmittingStorage ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>Wird revisionssicher gebucht...</span>
                      </>
                    ) : selectedStorageAddonGb === activeBookedGb ? (
                      <span>Aktuelles Paket unverändert</span>
                    ) : selectedStorageAddonGb > activeBookedGb ? (
                      <>
                        <Check size={16} />
                        <span>
                          {(currentSchoolProfile?.is_trial || currentSchoolProfile?.status === 'trial')
                            ? `✨ Im Probemonat gratis freischalten (ab Tag 31: ${selectedStorageAddonFee.toFixed(2).replace('.', ',')} € / Mo.)`
                            : `Kostenpflichtig buchen (${selectedStorageAddonFee.toFixed(2).replace('.', ',')} € / Mo. netto)`}
                        </span>
                      </>
                    ) : (
                      <>
                        <Clock size={16} />
                        <span>Speicher-Reduzierung zum Monatsende vormerken</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 🧾 Revisionssicheres Buchungsbeleg-Modal (Tier-1 Enterprise+) */}
      {storageBookingSuccessModal?.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="storage-booking-success-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            padding: '20px'
          }}
          onClick={() => setStorageBookingSuccessModal(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '520px',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '16px',
                background: storageBookingSuccessModal.isDowngrade ? '#fef3c7' : '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {storageBookingSuccessModal.isDowngrade ? (
                  <Clock size={26} color="#d97706" />
                ) : (
                  <CheckCircle2 size={26} color="#16a34a" />
                )}
              </div>
              <div>
                <span style={{ fontSize: '0.65rem', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '999px', fontWeight: 800, textTransform: 'uppercase' }}>
                  Buchung bestätigt
                </span>
                <h3 id="storage-booking-success-title" style={{ margin: '4px 0 0 0', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                  {storageBookingSuccessModal.isDowngrade 
                    ? 'Speicher-Reduzierung vorgemerkt' 
                    : 'Speichererweiterung erfolgreich gebucht'}
                </h3>
              </div>
            </div>

            {/* Receipt Details Box */}
            <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '18px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Revisionssichere Beleg-Nr.:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <code style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', background: '#ffffff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    {storageBookingSuccessModal.receiptNumber}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(storageBookingSuccessModal.receiptNumber);
                      alert('Belegnummer kopiert!');
                    }}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px' }}
                    title="Belegnummer kopieren"
                  >
                    <Copy size={14} color="#64748b" />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                <span style={{ color: '#64748b' }}>Neues Kontingent:</span>
                <strong style={{ color: '#0f172a' }}>
                  {storageBookingSuccessModal.newGb > 0 ? `+${storageBookingSuccessModal.newGb} GB` : 'Standard (1 GB Basis)'} ({(1.0 + storageBookingSuccessModal.newGb).toFixed(0)} GB Gesamt)
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                <span style={{ color: '#64748b' }}>Monatlicher Tarifbeitrag:</span>
                <strong style={{ color: '#0f172a' }}>
                  {storageBookingSuccessModal.newFee.toFixed(2).replace('.', ',')} € / Mo. netto
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                <span style={{ color: '#64748b' }}>Wirksamkeit:</span>
                <strong style={{ color: storageBookingSuccessModal.isDowngrade ? '#d97706' : '#16a34a' }}>
                  {storageBookingSuccessModal.isDowngrade 
                    ? `Zum ${storageBookingSuccessModal.effectiveDate || 'Monatsende'}` 
                    : 'Sofort aktiv'}
                </strong>
              </div>
            </div>

            <div style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: 1.45 }}>
              {storageBookingSuccessModal.isDowngrade ? (
                <span>
                  Dein bisheriger Speicherplatz bleibt bis zum Stichtag zu 100% erhalten. Es wurden keine Daten gelöscht. Der Beleg wurde unveränderbar im Buchungsjournal deiner Musikschule archiviert.
                </span>
              ) : (
                <span>
                  Das zusätzliche Speichervolumen steht deinen Lehrkräften und Schülern ab sofort zur Verfügung. Der Beleg wurde GoBD-konform im Buchungsjournal archiviert.
                </span>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setStorageBookingSuccessModal(null)}
                style={{
                  padding: '10px 22px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)'
                }}
              >
                Verstanden &amp; Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📢 Modal for Audio-Tresor Termination & Student Grace Period Setup */}
      {showStorageTerminationModal && (() => {
        const deadlineDate = new Date();
        deadlineDate.setDate(deadlineDate.getDate() + storageTerminationDays);
        const deadlineStr = deadlineDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="storage-termination-title"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              padding: '20px'
            }}
            onClick={() => setShowStorageTerminationModal(false)}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '600px',
                padding: '28px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid #e2e8f0',
                boxSizing: 'border-box'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '1.4rem' }}>📦</span>
                  </div>
                  <div>
                    <h3 id="storage-termination-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                      Audio-Tresor Kündigungs-Assistent
                    </h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#64748b' }}>
                      Faire Download-Frist für Schüler einleiten &amp; Speicher nach Ablauf auf 0,00 € zurücksetzen
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Dialog schließen"
                  onClick={() => setShowStorageTerminationModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Step 1: Frist wählen */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                  1. Wähle die Download-Frist für deine Schüler &amp; Eltern:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { days: 14, label: '14 Tage Frist', desc: 'Kurzfristig' },
                    { days: 30, label: '30 Tage Frist', desc: 'Empfohlen' },
                    { days: 60, label: '60 Tage Frist', desc: 'Schuljahres-Ende' }
                  ].map(opt => (
                    <div
                      key={opt.days}
                      onClick={() => setStorageTerminationDays(opt.days)}
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        border: '2px solid',
                        borderColor: storageTerminationDays === opt.days ? '#34a853' : '#e2e8f0',
                        background: storageTerminationDays === opt.days ? '#f0fdf4' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.84rem', color: storageTerminationDays === opt.days ? '#166534' : '#0f172a' }}>
                        {opt.label}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                        {opt.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 2: Vorschau der Schülermaske */}
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '14px 16px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                  👁️ So sieht der automatische Hinweis beim Schüler-Login aus:
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.45 }}>
                  <em>„Deine Musikschule stellt den Cloud-Audio-Tresor zum <strong>{deadlineStr}</strong> um. Sichere dir deine Songs &amp; Meisterwerke jetzt als ZIP-Archiv!“</em>
                </div>
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.68rem', background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
                    ✓ 1-Klick ZIP-Download
                  </span>
                  <span style={{ fontSize: '0.68rem', background: '#e0e7ff', color: '#4338ca', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
                    ✓ Automatisch sortiert (/Meisterwerke, /Loops)
                  </span>
                </div>
              </div>

              {/* Step 3: Was passiert am Stichtag */}
              <div style={{ fontSize: '0.70rem', color: '#64748b', lineHeight: 1.4, marginBottom: '20px' }}>
                ℹ️ <strong>Was passiert am Stichtag ({deadlineStr})?</strong><br />
                Der Cloud-Speicher wird physisch geleert und dein Tarif wird <strong>vollautomatisch auf das kostenlose Standard-Paket (0,00 €)</strong> umgestellt. Es entstehen keine weiteren Kosten.
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowStorageTerminationModal(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '0.78rem',
                    fontWeight: 750,
                    cursor: 'pointer'
                  }}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const deadlineIso = deadlineDate.toISOString();
                      const payload: any = {
                        storage_termination_status: 'active_grace_period',
                        storage_termination_deadline: deadlineIso
                      };

                      let { error } = await supabase
                        .from('schools')
                        .update(payload)
                        .eq('id', schoolId);

                      if (error && (error.message.includes('storage_termination') || error.message.includes('schema cache'))) {
                        console.warn("Storage termination DB note:", error.message);
                      }

                      // Persist in overrides
                      try {
                        const overridesStr = localStorage.getItem('groovelab_school_overrides') || '{}';
                        const overrides = JSON.parse(overridesStr);
                        overrides[schoolId] = {
                          ...(overrides[schoolId] || {}),
                          storage_termination_status: 'active_grace_period',
                          storage_termination_deadline: deadlineIso
                        };
                        localStorage.setItem('groovelab_school_overrides', JSON.stringify(overrides));
                        window.dispatchEvent(new Event('groovelab_school_updated'));
                      } catch (e) {
                        console.error(e);
                      }

                      setCurrentSchoolProfile((prev: any) => prev ? {
                        ...prev,
                        storage_termination_status: 'active_grace_period',
                        storage_termination_deadline: deadlineIso
                      } : prev);

                      setShowStorageTerminationModal(false);
                      alert(`✅ Kündigung mit Download-Frist erfolgreich aktiviert! Stichtag: ${deadlineStr}. Deine Schüler werden ab sofort beim Login zum ZIP-Download eingeladen.`);
                    } catch (err: any) {
                      alert("Fehler beim Aktivieren: " + err.message);
                    }
                  }}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
                  }}
                >
                  📢 Kündigung mit Frist ({storageTerminationDays} Tage) aktivieren
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal for Invoice Preview / Print */}
      {selectedInvoice && (
        <Suspense fallback={null}>
          <InvoicePreviewModal
            invoice={{
              id: selectedInvoice.id,
              date: selectedInvoice.date,
              dueDateStr: selectedInvoice.dueDateStr,
              amount: selectedInvoice.amount,
              status: selectedInvoice.status,
              type: selectedInvoice.type,
              isCurrentMonth: selectedInvoice.isCurrentMonth,
              hasCampus: hasCampusSub || !!campusActivatedThisMonth,
              hasGroovelab: hasGroovelabSub || !!groovelabActivatedThisMonth,
              totalTeachersCount: selectedInvoice.totalTeachersCount !== undefined ? selectedInvoice.totalTeachersCount : billableTeachersCount,
              activeCampusCount: selectedInvoice.activeCampusCount !== undefined ? selectedInvoice.activeCampusCount : activeStudentsCount_global,
              activeGroovelabCount: selectedInvoice.activeGroovelabCount !== undefined ? selectedInvoice.activeGroovelabCount : activeGroovelabStudentsCount_global,
              passiveStudentsCount: selectedInvoice.passiveStudentsCount !== undefined ? selectedInvoice.passiveStudentsCount : passiveStudentsCount_global,
              isSammelzahler: isSammelzahler,
              activeStudentFee: selectedInvoice.type === 'AKT' ? selectedInvoice.amount : 0,
              storageAddonGb: selectedInvoice.storageAddonGb !== undefined ? selectedInvoice.storageAddonGb : Number(currentSchoolProfile?.storage_addon_gb || selectedStorageAddonGb || 0),
              storageAddonMonthlyFee: selectedInvoice.storageAddonMonthlyFee !== undefined ? selectedInvoice.storageAddonMonthlyFee : (selectedStorageAddonFee || Number(currentSchoolProfile?.storage_addon_monthly_fee || 0)),
              activationsCount: selectedInvoice.activationsCount !== undefined ? selectedInvoice.activationsCount : activeStudentsCount_global,
              studentFee: selectedInvoice.studentFee || 0.49,
              restmonate: selectedInvoice.restmonate,
              auditHash: selectedInvoice.auditHash,
              activatedStudentsList: selectedInvoice.activatedStudentsList || []
            }}
            schoolName={schoolName || currentSchoolProfile?.name || 'Musäk Bad Säckingen'}
            schoolStreet={(
              (schoolStreet || currentSchoolProfile?.street || 'Karl-Fürstenberg-Str.') + ' ' + (schoolHouseNumber || currentSchoolProfile?.house_number || '59')
            ).trim()}
            schoolZipCode={schoolZipCode || currentSchoolProfile?.zip_code || '79618'}
            schoolCity={schoolCity || currentSchoolProfile?.city || 'Rheinfelden'}
            operatorCompany={operatorCompany || ''}
            operatorContact={operatorContact || ''}
            operatorStreet={operatorStreet || ''}
            operatorZip={operatorZip || ''}
            operatorCity={operatorCity || ''}
            operatorIban={operatorIban || ''}
            operatorBic={operatorBic || ''}
            billingPayer={billingPayer}
            studentBillingOption={studentBillingOption}
            leitwegId={currentSchoolProfile?.leitweg_id || undefined}
            onClose={() => setSelectedInvoice(null)}
          />
        </Suspense>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-subscription-title"
          style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '480px',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
            border: '1px solid #e2e8f0',
            fontFamily: 'Inter',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            animation: 'scaleUp 0.15s ease-out'
          }}>
            {(() => {
              const yearInfo = getSchoolYearEndInfo(simulatedToday, schoolContractEndsAt);
              return (
                <>
                  <h3 id="cancel-subscription-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                    Abonnement kündigen?
                  </h3>
                  
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: '1.5' }}>
                    Möchtest du das Cloud-Abrechnungssystem für **Campus-Groovelab** verbindlich zum Schuljahresende kündigen?
                  </p>
                  
                  <div style={{ 
                    background: '#fffbeb', 
                    border: '1px solid #fde68a', 
                    borderRadius: '12px', 
                    padding: '12px 14px', 
                    fontSize: '0.74rem', 
                    color: '#b45309',
                    lineHeight: '1.4'
                  }}>
                    <strong>Info zur Kündigungsfrist:</strong> Die Kündigung muss mit einer Frist von 1 Monat zum Schuljahresende (31.08.) eingereicht werden. Da das aktuelle Schuljahr am {yearInfo.formattedDate} endet, wird diese Kündigung wirksam zum <strong>{yearInfo.formattedDate}, 23:59 Uhr</strong>. Bis dahin bleibt dein Zugang für alle Lehrkräfte und Schüler voll aktiv.
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>
                      Kündigungsgrund (optional für unser Qualitätsteam):
                    </label>
                    <textarea
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      placeholder="Gibt es Feedback oder Wünsche, die wir verbessern können?..."
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.76rem',
                        minHeight: '60px',
                        outline: 'none',
                        fontFamily: 'inherit',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                    <button
                      onClick={() => setShowCancelModal(false)}
                      style={{
                        background: '#ffffff',
                        color: '#475569',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        padding: '10px 18px',
                        fontSize: '0.78rem',
                        fontWeight: 750,
                        cursor: 'pointer'
                      }}
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const endStr = yearInfo.endDateIso;
                          let generatedId = `KD-${schoolNumericId}-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`;

                          // 1. Authoritative RPC call
                          const { data: rpcRes, error: rpcErr } = await supabase.rpc('cancel_school_subscription', {
                            p_school_id: schoolId,
                            p_reason: cancellationReason || 'Ordentliche Kündigung zum Schuljahresende',
                            p_actor_id: (currentSchoolProfile as any)?.user_id || null,
                            p_simulated_date: simulatedToday || null
                          });

                          if (rpcErr) {
                            console.warn("RPC cancel_school_subscription failed, using resilient direct fallback:", rpcErr);
                            const { error: directErr } = await supabase
                              .from('schools')
                              .update({ contract_ends_at: endStr })
                              .eq('id', schoolId);
                            if (directErr) throw directErr;
                          } else if (rpcRes && rpcRes.cancellation_id) {
                            generatedId = rpcRes.cancellation_id;
                          }

                          if (setLastCancellationId) {
                            setLastCancellationId(generatedId);
                          }
                          setSchoolContractEndsAt(endStr);
                          setIsCancelled(true);
                          if (typeof window !== 'undefined') {
                            localStorage.setItem(`isCancelled_${schoolId}`, 'true');
                          }
                          setShowCancelModal(false);

                          // 2. Automatischer PDF-Kündigungsbeleg gem. § 312k Abs. 4 BGB
                          downloadCancellationReceiptPdf({
                            cancellationId: generatedId,
                            cancelledAt: new Date(),
                            effectiveEndDateFormatted: yearInfo.formattedDate,
                            schoolName: schoolName || currentSchoolProfile?.name
                          });
                        } catch (err: any) {
                          console.error("Cancellation error:", err);
                          alert("Fehler beim Kündigen des Vertrags. Bitte versuche es erneut.");
                        }
                      }}
                      style={{
                        background: '#ef4444',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '10px 18px',
                        fontSize: '0.78rem',
                        fontWeight: 750,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
                      }}
                    >
                      Vertrag verbindlich kündigen
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Module Upgrade Modal (Kombi-Vorteil Checkout gem. § 312j BGB) */}
      {showModuleUpgradeModal && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="module-upgrade-title"
          style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100002,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '540px',
            padding: '32px',
            boxShadow: '0 25px 60px -12px rgba(15, 23, 42, 0.25)',
            border: '1px solid #e2e8f0',
            fontFamily: 'Inter',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            animation: 'scaleUp 0.15s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: upgradeTargetModule === 'campus' ? '#e6f4ea' : '#fefce8',
                  color: upgradeTargetModule === 'campus' ? '#34a853' : '#ca8a04',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem'
                }}>
                  {upgradeTargetModule === 'campus' ? '🎒' : '⚡'}
                </div>
                <div>
                  <h3 id="module-upgrade-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                    {upgradeTargetModule === 'campus' ? 'Campus-Modul hinzubuchen' : 'GrooveLab-Modul hinzubuchen'}
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                    Kombi-Paket &amp; Infrastruktur-Vorteilsrabatt aktivieren
                  </span>
                </div>
              </div>
              <button
                type="button"
                aria-label="Dialog schließen"
                onClick={() => setShowModuleUpgradeModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: '1.5' }}>
              {upgradeTargetModule === 'campus'
                ? 'Erweitere deine Plattform um das volle Campus-Modul: Digitales Hausaufgabenheft, Schüler-Protokolle, Meisterwerk-Dokumentation, interaktive Audio-Loopstation, Übe-Timer und den intelligenten Raumplaner.'
                : 'Erweitere deine Plattform um das volle GrooveLab-Modul: Band-Rooms, Repertoire-Planer, Song-Bibliotheken, interaktive Band-Kommunikation und Live-Lab.'}
            </p>

            {/* Feature Highlights */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a' }}>
                Deine Vorteile auf einen Blick:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.72rem', color: '#475569' }}>
                <div>✓ Sofortige Freischaltung für alle</div>
                <div>✓ Co-Terminus bis 31. August</div>
                <div>✓ Revisionssicherer Audit-Trail</div>
                <div>✓ DSGVO-AVV automatisch erweitert</div>
              </div>
            </div>

            {/* PAngV Pricing Breakdown Box */}
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
              border: '1.5px solid #bbf7d0',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#64748b' }}>
                <span>Bisheriger Hosting-Beitrag ({upgradeTargetModule === 'campus' ? 'GrooveLab' : 'Campus'}):</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{upgradeTargetModule === 'campus' ? '9,90 € / Mo.' : '14,90 € / Mo.'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#64748b' }}>
                <span>Regulärer Modulpreis ({upgradeTargetModule === 'campus' ? 'Campus' : 'GrooveLab'}):</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{upgradeTargetModule === 'campus' ? '14,90 € / Mo.' : '9,90 € / Mo.'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#16a34a', fontWeight: 700 }}>
                <span>Kombi-Vorteilsrabatt (Infrastruktur-Bündel):</span>
                <span>-4,90 € / Mo.</span>
              </div>
              <div style={{ height: '1px', background: '#dcfce7', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>Neuer Gesamt-Hostingpreis:</div>
                  <div style={{ fontSize: '0.70rem', color: '#16a34a', fontWeight: 700 }}>Effektive monatliche Mehrkosten: +10,00 € / Mo.</div>
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#15803d', fontFamily: 'Urbanist' }}>
                  19,90 € <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>/ Monat</span>
                </div>
              </div>
            </div>

            {/* Legal terms hint */}
            <div style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: '1.4' }}>
              Mit Klick auf den Button stimmst du der Vertragsänderung zu. Das Modul dockt an deine bestehende Vertragslaufzeit bis zum <strong>31. August</strong> an. Abrechnung erfolgt bequem über deine bestehende Zahlungsart.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setShowModuleUpgradeModal(false)}
                disabled={upgradeProcessing}
                style={{
                  background: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '11px',
                  padding: '10px 18px',
                  fontSize: '0.78rem',
                  fontWeight: 750,
                  cursor: 'pointer'
                }}
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={upgradeProcessing}
                onClick={async () => {
                  setUpgradeProcessing(true);
                  try {
                    const yearInfo = getSchoolYearEndInfo(simulatedToday, schoolContractEndsAt);
                    let genUpgradeId = `UPG-${schoolNumericId}-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`;

                    // 1. Authoritative RPC
                    const { data: rpcRes, error: rpcErr } = await supabase.rpc('upgrade_school_subscription', {
                      p_school_id: schoolId,
                      p_target_module: upgradeTargetModule,
                      p_actor_id: (currentSchoolProfile as any)?.user_id || null,
                      p_simulated_date: simulatedToday || null
                    });

                    if (rpcErr) {
                      console.warn("RPC upgrade_school_subscription failed, using resilient fallback:", rpcErr);
                      const updatePayload = upgradeTargetModule === 'campus'
                        ? { has_campus_subscription: true, is_billing_booked: true }
                        : { has_groovelab_subscription: true, is_billing_booked: true };
                      const { error: directErr } = await supabase
                        .from('schools')
                        .update(updatePayload)
                        .eq('id', schoolId);
                      if (directErr) throw directErr;
                    } else if (rpcRes && rpcRes.upgrade_id) {
                      genUpgradeId = rpcRes.upgrade_id;
                    }

                    // 2. Update local state
                    if (upgradeTargetModule === 'campus') {
                      setHasCampusSub(true);
                      if (typeof window !== 'undefined') localStorage.setItem(`hasCampusSub_${schoolId}`, 'true');
                    } else {
                      setHasGroovelabSub(true);
                      if (typeof window !== 'undefined') localStorage.setItem(`hasGroovelabSub_${schoolId}`, 'true');
                    }

                    setShowModuleUpgradeModal(false);

                    // 3. Generate and download PDF receipt gem. § 311/312i BGB
                    await downloadUpgradeConfirmationPdf({
                      upgradeId: genUpgradeId,
                      targetModule: upgradeTargetModule,
                      schoolName: schoolName || currentSchoolProfile?.name,
                      effectiveEndDateFormatted: yearInfo.formattedDate
                    });

                    alert(`🎉 Herzlichen Glückwunsch! Das ${upgradeTargetModule === 'campus' ? 'Campus-Modul' : 'GrooveLab-Modul'} wurde erfolgreich aktiviert. Dein Kombi-Vorteil ist ab sofort aktiv.`);
                  } catch (err: any) {
                    console.error("Upgrade error:", err);
                    alert("Fehler beim Modul-Upgrade. Bitte versuche es erneut.");
                  } finally {
                    setUpgradeProcessing(false);
                  }
                }}
                className="hover-scale"
                style={{
                  background: upgradeTargetModule === 'campus' ? '#34a853' : '#eab308',
                  color: upgradeTargetModule === 'campus' ? '#ffffff' : '#0f172a',
                  border: 'none',
                  borderRadius: '11px',
                  padding: '10px 20px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: upgradeProcessing ? 'wait' : 'pointer',
                  boxShadow: upgradeTargetModule === 'campus' ? '0 4px 14px rgba(52, 168, 83, 0.25)' : '0 4px 14px rgba(234, 179, 8, 0.25)',
                  transition: 'all 0.2s'
                }}
              >
                {upgradeProcessing ? 'Wird aktiviert...' : `Zahlungspflichtig auf Kombi-Paket upgraden (+10,00 € / Mo.)`}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default SecretaryBillingModalsHub;
