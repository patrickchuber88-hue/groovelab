import React, { useMemo, useEffect } from 'react';
import { Calendar, CreditCard, Users, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { getDynamicAnnualPrice } from './licenses/licenseUtils';

export interface SecretaryInvoiceHistorySectionProps {
  schoolId: string;
  formattedSchoolNumericId: string;
  students: any[];
  contractStartDate?: string | null;
  simulatedToday?: string | null;
  studentBillingOption: string;
  extraBillingOption?: string;
  bookedExtraUsers?: number;
  currentTotalB2B?: number;
  subscriptionBypass?: boolean;
  activeStudentsCount_global: number;
  activeGroovelabStudentsCount_global: number;
  passiveStudentsCount_global: number;
  billableTeachersCount: number;
  moduleCost_global: number;
  teacherServiceFeeTotal_global: number;
  storageAddonFee_global: number;
  effectiveSchoolRates?: {
    priceCampus?: number;
    priceGroovelab?: number;
    priceKombi?: number;
    priceTeacher?: number;
    priceStudent?: number;
  };
  currentSchoolProfile?: any;
  selectedStorageAddonGb?: number;
  selectedStorageAddonFee?: number;
  billingPayer: string;
  expandedYears: Record<string, boolean>;
  setExpandedYears: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setActiveStudentsModalList: (val: any) => void;
  onOpenDunningPayModal?: (inv: any) => void;
  setSelectedInvoice: (inv: any) => void;
  agreedToSepa?: boolean;
  supabase?: any;
}

const deMonths = [
  '', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

const deShortMonths: Record<string, string> = {
  'Januar': 'Jan.', 'Februar': 'Feb.', 'März': 'März', 'April': 'Apr.', 'Mai': 'Mai', 'Juni': 'Juni', 
  'Juli': 'Juli', 'August': 'Aug.', 'September': 'Sept.', 'Oktober': 'Okt.', 'November': 'Nov.', 'Dezember': 'Dez.'
};

export const SecretaryInvoiceHistorySection: React.FC<SecretaryInvoiceHistorySectionProps> = ({
  schoolId,
  formattedSchoolNumericId,
  students,
  contractStartDate,
  simulatedToday,
  studentBillingOption,
  extraBillingOption,
  bookedExtraUsers = 0,
  currentTotalB2B = 0,
  subscriptionBypass = false,
  activeStudentsCount_global,
  activeGroovelabStudentsCount_global,
  passiveStudentsCount_global,
  billableTeachersCount,
  moduleCost_global,
  teacherServiceFeeTotal_global,
  storageAddonFee_global,
  effectiveSchoolRates = {},
  currentSchoolProfile,
  selectedStorageAddonGb = 0,
  selectedStorageAddonFee = 0,
  billingPayer,
  expandedYears,
  setExpandedYears,
  setActiveStudentsModalList,
  onOpenDunningPayModal,
  setSelectedInvoice,
  agreedToSepa = false,
  supabase
}) => {
  // Helper function to get last day of month as string
  const getLastDayOfMonth = (monthName: string, yearVal: string) => {
    const monthsMap: Record<string, number> = {
      'Januar': 1, 'Februar': 2, 'März': 3, 'April': 4, 'Mai': 5, 'Juni': 6,
      'Juli': 7, 'August': 8, 'September': 9, 'Oktober': 10, 'November': 11, 'Dezember': 12
    };
    const m = monthsMap[monthName] || 6;
    const y = parseInt(yearVal, 10);
    const lastDay = new Date(y, m, 0).getDate();
    const shortM = deShortMonths[monthName] || monthName;
    return `${lastDay}. ${shortM} ${y}`;
  };

  // 🏛️ Kanonische Fälligkeitsberechnung: 30 Tage netto gem. § 286 Abs. 3 BGB & Werktags-Klausel gem. § 193 BGB
  const calculateCanonicalDueDate = (year: number, monthIndex1Based: number, lastDay: number) => {
    const d = new Date(year, monthIndex1Based - 1, lastDay);
    d.setDate(d.getDate() + 30); // 30 Tage Zahlungsziel gem. BGB § 286 Abs. 3 & BILLING_CANONICAL_LOGIC.md
    
    // § 193 BGB Werktags-Klausel: Fällt Fälligkeit auf Samstag/Sonntag, verschiebt sie sich auf den nächsten Werktag
    if (d.getDay() === 6) {
      d.setDate(d.getDate() + 2); // Samstag -> Montag
    } else if (d.getDay() === 0) {
      d.setDate(d.getDate() + 1); // Sonntag -> Montag
    }
    
    const day = d.getDate();
    const rawMonthName = deMonths[d.getMonth() + 1];
    const shortM = deShortMonths[rawMonthName] || rawMonthName;
    const yr = d.getFullYear();
    return {
      dueDateStr: `${day}. ${shortM} ${yr}`,
      dueDateObj: d
    };
  };

  // Build Invoices Data deterministically
  const { invoicesData, grouped, monthKeys } = useMemo(() => {
    const isAnnualBilling = studentBillingOption === 'option1' || studentBillingOption === 'option3_2' || studentBillingOption === 'debit' || studentBillingOption === 'cash' || studentBillingOption === 'both';
    const annualPricePerStudent = (studentBillingOption === 'option1' || studentBillingOption === 'debit' || studentBillingOption === 'cash' || studentBillingOption === 'both') ? getDynamicAnnualPrice(contractStartDate, false) : studentBillingOption === 'option3_2' ? getDynamicAnnualPrice(contractStartDate, true) : 0;
    const einmalzahlungTotal = isAnnualBilling ? students.length * annualPricePerStudent : 0;
    
    const isExtraAnnualBilling = extraBillingOption === 'option1' || extraBillingOption === 'option3_2';
    const extraAnnualPrice = extraBillingOption === 'option1' ? getDynamicAnnualPrice(contractStartDate, false) : extraBillingOption === 'option3_2' ? getDynamicAnnualPrice(contractStartDate, true) : 0;
    const extraEinmalzahlungTotal = isExtraAnnualBilling ? bookedExtraUsers * extraAnnualPrice : 0;
    const totalB2BWithEinmalzahlung = currentTotalB2B + einmalzahlungTotal + extraEinmalzahlungTotal;

    const contractDateObj = contractStartDate ? new Date(contractStartDate) : new Date();
    const startYear = contractDateObj.getFullYear();
    const startMonth = contractDateObj.getMonth() + 1; // 1-indexed

    const systemDate = simulatedToday ? new Date(simulatedToday + 'T14:00:00') : new Date();
    const currentYear = systemDate.getFullYear();
    const currentMonth = systemDate.getMonth() + 1;

    const list: any[] = [];
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
      
      // Kanonische Fälligkeit nach § 286 / § 193 BGB (30 Tage netto)
      const { dueDateStr, dueDateObj } = calculateCanonicalDueDate(y, m, lastDay);

      const infId = `INF-${formattedSchoolNumericId}-${yearShort}${monthStr}-01`;
      const aktId = `AKT-${formattedSchoolNumericId}-${yearShort}${monthStr}-01`;

      const isSepaActive = Boolean(
        agreedToSepa || 
        currentSchoolProfile?.has_sepa_mandate || 
        currentSchoolProfile?.payment_method === 'sepa_debit' ||
        currentSchoolProfile?.payment_method === 'direct_debit'
      );

      let paidInvoicesList: string[] = [];
      try {
        if (typeof window !== 'undefined') {
          const storedPaid = localStorage.getItem(`paid_invoices_${schoolId}`);
          paidInvoicesList = storedPaid ? JSON.parse(storedPaid) : [];
        }
      } catch {}

      const isPastDueDate = systemDate.getTime() > dueDateObj.getTime();
      const isInfPaidExplicit = paidInvoicesList.includes(infId) || paidInvoicesList.includes(`RE-${formattedSchoolNumericId}-${yearShort}${monthStr}-01`);
      const isAktPaidExplicit = paidInvoicesList.includes(aktId);

      // Vergangene Monate bei aktivem SEPA-Mandat gelten als automatisch per Lastschrift eingezogen
      const isInfPaid = isInfPaidExplicit || (isSepaActive && isPastDueDate && isCreated);
      const isAktPaid = isAktPaidExplicit || (isSepaActive && isPastDueDate && isCreated);

      const resolveInvoiceStatus = (isPaid: boolean) => {
        if (isPaid) return 'Bezahlt';
        if (!isCreated || isCurrent) return 'Vorschau';
        if (isPastDueDate) return 'Überfällig';
        return isSepaActive ? 'SEPA vorgemerkt' : 'Fällig';
      };

      const infStatus = resolveInvoiceStatus(isInfPaid);
      const aktStatus = resolveInvoiceStatus(isAktPaid);

      const resolveCountdownSubtitle = (status: string) => {
        if (status === 'Bezahlt') {
          return isSepaActive ? 'Via SEPA eingezogen' : 'Vollständig beglichen';
        }
        if (status === 'Vorschau') {
          return 'Monatsabschluss: 23:58 Uhr';
        }
        const diffMs = dueDateObj.getTime() - systemDate.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        
        if (isSepaActive) {
          if (diffDays > 0) return `SEPA-Einzug am ${dueDateStr} (in ${diffDays} ${diffDays === 1 ? 'Tag' : 'Tagen'})`;
          if (diffDays === 0) return 'SEPA-Einzug heute';
          return `SEPA-Einzug am ${dueDateStr}`;
        }
        
        if (diffDays > 0) {
          return `Fällig bis ${dueDateStr} (in ${diffDays} ${diffDays === 1 ? 'Tag' : 'Tagen'})`;
        } else if (diffDays === 0) {
          return `Fällig heute (${dueDateStr})`;
        } else {
          const overdueDays = Math.abs(diffDays);
          return `Fällig war: ${dueDateStr} (seit ${overdueDays} ${overdueDays === 1 ? 'Tag' : 'Tagen'})`;
        }
      };

      const infCountdownStr = resolveCountdownSubtitle(infStatus);
      const aktCountdownStr = resolveCountdownSubtitle(aktStatus);

      const targetMonthZeroIndexed = m - 1;
      const targetYear = y;
      const targetMonthEnd = new Date(y, m, 0, 23, 59, 59, 999);
      const targetMonthStart = new Date(y, m - 1, 1, 0, 0, 0, 0);

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

      // 1. Infrastruktur-Rechnung
      const infPureAmount = subscriptionBypass ? 0 : parseFloat((moduleCost_global + teacherServiceFeeTotal_global + monthPassiveFee + storageAddonFee_global + monthGroovelabStudentFee).toFixed(2));

      // 2. Sammelrechnung Schüleraktivierungen
      const monthAktPureAmount = subscriptionBypass ? 0 : parseFloat((
        monthCampusActiveCount * (effectiveSchoolRates.priceStudent || 0.49)
      ).toFixed(2));

      const monthActivations = students.filter((s: any) => {
        const isCurrentlyActive = s.isCampusActive || s.is_campus_active;
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

      let infRecord: any = {
        id: infId,
        type: "INF",
        year: String(y),
        monthName: monthName,
        date: invoiceDateStr,
        dueDateStr: dueDateStr,
        dueDateObj: dueDateObj,
        countdownStr: infCountdownStr,
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
        auditHash: `CG-INF-${formattedSchoolNumericId}-${yearShort}${monthStr}`,
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
        dueDateObj: dueDateObj,
        countdownStr: aktCountdownStr,
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
        auditHash: `CG-AKT-${formattedSchoolNumericId}-${yearShort}${monthStr}`,
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

      list.push(infRecord);

      if (aktRecord.amount > 0 && (billingPayer === "school" || studentBillingOption === "option2" || studentBillingOption === "option3_2" || studentBillingOption === "option3_3")) {
        list.push(aktRecord);
      }

      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }

    list.reverse();

    const groupedMap: Record<string, typeof list> = {};
    const keys: string[] = [];
    list.forEach(inv => {
      const key = `${inv.monthName} ${inv.year}`;
      if (!groupedMap[key]) {
        groupedMap[key] = [];
        keys.push(key);
      }
      groupedMap[key].push(inv);
    });

    return {
      invoicesData: list,
      grouped: groupedMap,
      monthKeys: keys
    };
  }, [
    contractStartDate,
    students,
    simulatedToday,
    formattedSchoolNumericId,
    schoolId,
    activeStudentsCount_global,
    activeGroovelabStudentsCount_global,
    passiveStudentsCount_global,
    billableTeachersCount,
    moduleCost_global,
    teacherServiceFeeTotal_global,
    storageAddonFee_global,
    effectiveSchoolRates,
    studentBillingOption,
    extraBillingOption,
    bookedExtraUsers,
    currentTotalB2B,
    subscriptionBypass,
    currentSchoolProfile,
    selectedStorageAddonGb,
    selectedStorageAddonFee,
    billingPayer,
    agreedToSepa
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, fontFamily: 'Urbanist, sans-serif', color: '#0f172a', letterSpacing: '-0.01em' }}>
          Rechnungs-Historie
        </h4>
        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
          GoBD-Archiv &amp; Monatsabrechnungen (Steuerrechtlich revisionssicher)
        </span>
      </div>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(15, 23, 42, 0.03)', background: '#ffffff' }}>
        {/* 🏛️ Master Table Header (100% Symmetrie & Zero Stutter) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(210px, 2fr) minmax(180px, 1.4fr) minmax(160px, 1.2fr) 100px 100px minmax(170px, auto)',
          alignItems: 'center',
          columnGap: '16px',
          padding: '9px 18px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          fontSize: '0.67rem',
          fontWeight: 800,
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          <span>Beleg &amp; Modul</span>
          <span>Datum &amp; Fälligkeit</span>
          <span>Klassifizierung</span>
          <span style={{ textAlign: 'center' }}>Status</span>
          <span style={{ textAlign: 'right' }}>Betrag</span>
          <span style={{ textAlign: 'right' }}>Aktionen</span>
        </div>

        {monthKeys.map((monthKey) => {
          const isExpanded = expandedYears[monthKey] !== false;
          const monthInvoices = grouped[monthKey] || [];
          const totalMonthAmount = monthInvoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0);
          const hasPreview = monthInvoices.some((inv: any) => inv.status === 'Vorschau');
          const allPaid = monthInvoices.length > 0 && monthInvoices.every((inv: any) => inv.status === 'Bezahlt' || inv.paid === true);
          const hasOverdue = monthInvoices.some((inv: any) => inv.status === 'Überfällig');

          let monthBadgeBg = '#f1f5f9';
          let monthBadgeColor = '#475569';
          let monthBadgeText = 'Fällig';

          if (hasPreview) {
            monthBadgeBg = '#fef3c7';
            monthBadgeColor = '#b45309';
            monthBadgeText = 'Entwurf';
          } else if (allPaid) {
            monthBadgeBg = '#ecfdf5';
            monthBadgeColor = '#047857';
            monthBadgeText = 'Alle bezahlt ✓';
          } else if (hasOverdue) {
            monthBadgeBg = '#fef2f2';
            monthBadgeColor = '#b91c1c';
            monthBadgeText = 'Zahlung überfällig';
          } else {
            monthBadgeBg = '#eff6ff';
            monthBadgeColor = '#1d4ed8';
            monthBadgeText = Boolean(agreedToSepa || currentSchoolProfile?.has_sepa_mandate) ? 'SEPA vorgemerkt' : 'Fällig';
          }

          return (
            <div key={monthKey} id={`month-section-${monthKey.replace(/\s+/g, '-')}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <div 
                onClick={() => setExpandedYears(prev => ({ ...prev, [monthKey]: !isExpanded }))}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setExpandedYears(prev => ({ ...prev, [monthKey]: !isExpanded }));
                  }
                }}
                aria-expanded={isExpanded}
                style={{
                  background: '#f8fafc',
                  padding: '10px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  userSelect: 'none',
                  borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
                  transition: 'background 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={14} color="#64748b" style={{ verticalAlign: 'middle' }} />
                  <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b', letterSpacing: '-0.01em' }}>
                    {monthKey}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                    {monthInvoices.length} {monthInvoices.length === 1 ? 'Beleg' : 'Belege'} • <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{totalMonthAmount.toFixed(2).replace('.', ',')} €</strong>
                  </span>
                  
                  <span style={{ 
                    fontSize: '0.66rem', 
                    fontWeight: 700, 
                    padding: '2px 8px', 
                    borderRadius: '9999px', 
                    background: monthBadgeBg, 
                    color: monthBadgeColor 
                  }}>
                    {monthBadgeText}
                  </span>

                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', marginLeft: '4px' }}>
                    {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </span>
                </div>
              </div>
              
              {isExpanded && grouped[monthKey].map((inv) => {
                const isPaid = inv.status === 'Bezahlt' || inv.paid === true;
                const isPreview = inv.status === 'Vorschau';
                const isOverdue = inv.status === 'Überfällig';
                const isDueOrSepa = inv.status === 'Fällig' || inv.status === 'SEPA vorgemerkt';

                let badgeBg = '#f1f5f9';
                let badgeColor = '#475569';
                let statusLabel = inv.status;

                if (isPaid) {
                  badgeBg = '#ecfdf5';
                  badgeColor = '#047857';
                  statusLabel = 'Bezahlt ✓';
                } else if (isPreview) {
                  badgeBg = '#fef3c7';
                  badgeColor = '#b45309';
                  statusLabel = 'Vorschau';
                } else if (isOverdue) {
                  badgeBg = '#fef2f2';
                  badgeColor = '#b91c1c';
                  statusLabel = 'Überfällig';
                } else if (isDueOrSepa) {
                  badgeBg = '#eff6ff';
                  badgeColor = '#1d4ed8';
                  statusLabel = inv.status;
                }

                return (
                  <div 
                    key={inv.id} 
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'minmax(210px, 2fr) minmax(180px, 1.4fr) minmax(160px, 1.2fr) 100px 100px minmax(170px, auto)',
                      alignItems: 'center', 
                      columnGap: '16px',
                      padding: '10px 18px', 
                      borderBottom: '1px solid #f1f5f9', 
                      background: '#ffffff',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {/* Spalte 1: Beleg-ID & Modul */}
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.82rem', color: '#0f172a', letterSpacing: '0.01em', fontWeight: 800 }}>
                        {inv.amount < 0 
                          ? inv.id.replace('INV-', 'GS-') 
                          : inv.id.replace('INV-', 'RE-')}
                      </strong>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, marginTop: '2px' }}>
                        {inv.type === 'INF' ? (
                          <>
                            <CreditCard size={12} color="#64748b" style={{ verticalAlign: 'middle' }} />
                            Service- &amp; Infrastruktur
                          </>
                        ) : (
                          <>
                            <Users size={12} color="#64748b" style={{ verticalAlign: 'middle' }} />
                            {billingPayer === 'student' ? 'Direktabrechnung Schüler' : 'Sammelabrechnung Schüler'}
                          </>
                        )}
                      </span>
                    </div>

                    {/* Spalte 2: Datum & Fälligkeit mit Countdown-Intelligenz */}
                    <div>
                      <span style={{ fontSize: '0.74rem', color: '#334155', display: 'block', fontWeight: 600 }}>
                        {getLastDayOfMonth(inv.monthName, inv.year)}
                      </span>
                      <span style={{ 
                        fontSize: '0.70rem', 
                        color: isOverdue ? '#b91c1c' : '#64748b', 
                        fontWeight: isOverdue ? 700 : 500,
                        display: 'block', 
                        marginTop: '1px' 
                      }}>
                        {inv.countdownStr || `Fällig: ${inv.dueDateStr}`}
                      </span>
                    </div>

                    {/* Spalte 3: Klassifizierung (Kein Leerloch!) */}
                    <div>
                      {inv.type === 'AKT' ? (
                        <span style={{ 
                          fontSize: '0.68rem', 
                          color: billingPayer === 'student' ? '#15803d' : '#9a3412', 
                          background: billingPayer === 'student' ? '#f0fdf4' : '#fff7ed', 
                          padding: '3px 8px', 
                          borderRadius: '6px', 
                          fontWeight: 700,
                          display: 'inline-block'
                        }}>
                          {billingPayer === 'student' ? 'Direkt (Familien)' : 'Sammel (Schule)'}
                        </span>
                      ) : (
                        <span style={{ 
                          fontSize: '0.68rem', 
                          color: '#475569', 
                          background: '#f1f5f9', 
                          padding: '3px 8px', 
                          borderRadius: '6px', 
                          fontWeight: 700,
                          display: 'inline-block'
                        }}>
                          Fixgebühr Schulträger
                        </span>
                      )}
                    </div>

                    {/* Spalte 4: Fester Status-Anchor (100% symmetrisch) */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <span style={{ 
                        background: badgeBg, 
                        color: badgeColor, 
                        fontSize: '0.68rem', 
                        padding: '3px 9px', 
                        borderRadius: '9999px', 
                        fontWeight: 700,
                        display: 'inline-block',
                        textAlign: 'center'
                      }}>
                        {statusLabel}
                      </span>
                    </div>

                    {/* Spalte 5: Rechnungsbetrag (Tabular Numbers) */}
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ 
                        fontSize: '0.96rem', 
                        color: '#0f172a', 
                        fontWeight: 800, 
                        fontVariantNumeric: 'tabular-nums',
                        display: 'block'
                      }}>
                        {inv.amount.toFixed(2).replace('.', ',')} €
                      </strong>
                    </div>

                    {/* Spalte 6: Aktionen (Rechtsbündig, kompakt) */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      {inv.type === 'AKT' && (
                        <button 
                          type="button"
                          onClick={() => setActiveStudentsModalList({ 
                            list: inv.activatedStudentsList || [], 
                            month: monthKey,
                            amount: inv.amount,
                            campusCount: inv.activeCampusCount,
                            groovelabCount: inv.activeGroovelabCount,
                            passiveCount: inv.passiveStudentsCount
                          })} 
                          style={{ 
                            border: '1px solid #cbd5e1', 
                            background: '#ffffff', 
                            color: '#334155', 
                            borderRadius: '8px', 
                            padding: '4px 9px', 
                            fontSize: '0.74rem', 
                            fontWeight: 700,
                            cursor: 'pointer', 
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'all 0.15s ease' 
                          }}
                          title="Aktivierte Schüler anzeigen"
                        >
                          <Users size={12} color="#64748b" />
                          Schüler ({inv.activatedStudentsList?.length || inv.activationsCount || 0})
                        </button>
                      )}

                      <button 
                        type="button"
                        onClick={() => setSelectedInvoice(inv)} 
                        style={{ 
                          border: '1px solid #cbd5e1', 
                          background: '#ffffff', 
                          color: '#334155', 
                          borderRadius: '8px', 
                          padding: '4px 10px', 
                          fontSize: '0.74rem', 
                          fontWeight: 700,
                          cursor: 'pointer', 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease' 
                        }}
                        title="GoBD-Beleg, EPC-QR GiroCode und Druckansicht öffnen"
                      >
                        <FileText size={12} color="#64748b" />
                        Beleg
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
