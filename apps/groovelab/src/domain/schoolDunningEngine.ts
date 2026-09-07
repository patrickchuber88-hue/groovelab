/**
 * Enterprise B2B Delinquency & Grace Period Domain Engine
 * Campus-Groovelab FinOps Governance Architecture
 * 
 * Provides 100% deterministic, stateless evaluation of B2B payment statuses
 * ensuring the Student-First Didactic Immunity Axiom and Zero-Deletion Guarantee.
 */

export type SchoolDunningLevel =
  | 'level_0_current'           // Days 1–14 (or no overdue invoices): Normal operation, Grace Period
  | 'level_1_reminder'          // Days 15–22: 1st Reminder, subtle dashboard hint in Secretariat
  | 'level_2_warning'           // Days 23–29: 7-day countdown warning before Admin Read-Only
  | 'level_3_admin_readonly'    // Days 30–37: Admin Read-Only in Secretariat, Audio-Tresor Read-Only
  | 'level_4_teacher_warning'   // Days 38–44: 7-day countdown before Didactic Read-Only for Teachers
  | 'level_5_full_readonly';    // Days 45+: Didactic Read-Only for Teachers. Students stay 100% active.

export interface OverdueInvoiceSummary {
  id: string;
  amount: number;
  due_date: string;
  type: string;
  overdueDays: number;
}

export interface SchoolDunningStatus {
  level: SchoolDunningLevel;
  overdueDays: number;
  oldestOverdueInvoice: OverdueInvoiceSummary | null;
  totalOverdueAmount: number;
  unpaidInvoicesCount: number;
  overdueInvoicesList: OverdueInvoiceSummary[];

  // Behavioral Access Flags
  isSecretaryReadOnly: boolean;
  isAudioTresorReadOnly: boolean;
  isTeacherReadOnly: boolean;

  // Real-time Countdowns (Days remaining until next restriction)
  adminCountdownDays: number;   // Days remaining until next admin restriction
  teacherCountdownDays: number; // Days remaining until next teacher restriction

  // Status Meta
  isDelinquent: boolean;        // True if level >= level_1_reminder
  isExempt: boolean;            // True if bypass or active trial protects the school
  exemptionReason?: 'subscription_bypass' | 'active_trial' | 'no_overdue';

  // Veredelungs-Metriken
  dunningFee: number;           // 14.90, 9.90, or 19.90 € based on booked modules
  isDunningFeeApplied: boolean; // True if level >= level_3_admin_readonly
  isTrustExtended: boolean;     // True if 48h trust pass is active
  trustRemainingHours: number;  // Hours remaining on 48h trust pass
  isKulanzActive: boolean;      // True if Master Admin granted +30 days grace extension
  isMunicipal: boolean;         // True if school is public/municipal
  isSummerMoratorium: boolean;  // True if summer break moratorium is applied
  baseGraceDays: number;        // 14, 28, or 35
}

/**
 * Normalizes date to midnight UTC to prevent daylight saving time / timezone skew.
 */
function parseDateToMidnight(dateInput: Date | string | number): Date {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return new Date(0);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/**
 * Computes deterministic B2B dunning status based on school settings and invoice history.
 */
export function computeSchoolDunningStatus(
  school: any,
  invoices: any[] = [],
  simulatedDate?: Date | string
): SchoolDunningStatus {
  const refDate = parseDateToMidnight(simulatedDate || new Date());

  // Calculate module-specific late fee: Campus 14.90, GrooveLab 9.90, Kombi 19.90 €
  const hasCampus = school?.has_campus_subscription !== false;
  const hasGroovelab = school?.has_groovelab_subscription === true;
  let dunningFee = 19.90;
  if (hasCampus && !hasGroovelab) {
    dunningFee = 14.90;
  } else if (!hasCampus && hasGroovelab) {
    dunningFee = 9.90;
  }

  // Check Municipal status (Leitweg-ID or explicit flag)
  const isMunicipal = Boolean(
    school?.is_municipal === true || 
    (typeof school?.leitweg_id === 'string' && school.leitweg_id.trim().length > 0)
  );

  // Check Summer Moratorium: July/August or explicitly active
  const refMonth = refDate.getUTCMonth(); // 6 = July, 7 = August
  const isSummerMonth = refMonth === 6 || refMonth === 7;
  const isSummerMoratorium = Boolean(
    school?.summer_moratorium_active === true || 
    (isSummerMonth && school?.summer_moratorium_disabled !== true)
  );

  // Standard Grace Period for ALL tenants is 28 days (4 full weeks)
  // Perfectly covers municipal kassenamt cycles, association boards, and standard B2B terms
  let baseGraceDays = 28;
  if (isSummerMoratorium) {
    baseGraceDays = 42; // 6 weeks during summer holidays (July/August)
  }

  // Check 48h Trust Extension
  let isTrustExtended = false;
  let trustRemainingHours = 0;
  if (school?.dunning_trust_extension_until) {
    const trustUntil = new Date(school.dunning_trust_extension_until).getTime();
    const nowTime = refDate.getTime();
    if (trustUntil > nowTime) {
      isTrustExtended = true;
      trustRemainingHours = Math.max(1, Math.ceil((trustUntil - nowTime) / (1000 * 60 * 60)));
    }
  }

  // Check Kulanzjoker (Master Admin Grace Extension & Fee Waiver: +30 Days & 0 € late fee)
  let isKulanzActive = false;
  if (school?.dunning_kulanz_until) {
    const kulanzUntil = new Date(school.dunning_kulanz_until).getTime();
    if (kulanzUntil > refDate.getTime()) {
      isKulanzActive = true;
      baseGraceDays += 30;
      dunningFee = 0;
      isTrustExtended = true;
    }
  }

  // 1. Exemption: Sponsoring / VIP Subscription Bypass
  if (school?.subscription_bypass === true) {
    return createExemptStatus('subscription_bypass', {
      dunningFee,
      isMunicipal,
      isSummerMoratorium,
      baseGraceDays
    });
  }

  // 2. Exemption: Active 30-day Free Trial
  if (school?.is_trial === true) {
    if (!school.trial_ends_at) {
      return createExemptStatus('active_trial', {
        dunningFee,
        isMunicipal,
        isSummerMoratorium,
        baseGraceDays
      });
    }
    const trialEnd = parseDateToMidnight(school.trial_ends_at);
    if (trialEnd.getTime() >= refDate.getTime()) {
      return createExemptStatus('active_trial', {
        dunningFee,
        isMunicipal,
        isSummerMoratorium,
        baseGraceDays
      });
    }
  }

  // 3. Filter unpaid and overdue invoices
  const overdueInvoices: OverdueInvoiceSummary[] = [];
  let totalOverdueAmount = 0;

  if (Array.isArray(invoices)) {
    for (const inv of invoices) {
      if (!inv || !inv.due_date) continue;

      const statusLower = String(inv.status || '').toLowerCase().trim();
      const isPaid = statusLower === 'paid' || 
                     statusLower === 'bezahlt' || 
                     statusLower === 'cancelled' || 
                     statusLower === 'storniert';

      if (isPaid) continue;

      const dueDate = parseDateToMidnight(inv.due_date);
      const diffMs = refDate.getTime() - dueDate.getTime();
      const overdueDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      // Overdue starts when reference date is strictly after due date (overdueDays >= 1)
      if (overdueDays >= 1) {
        const amount = Number(inv.amount || (inv.items && inv.items.amount) || 0);
        overdueInvoices.push({
          id: String(inv.id || ''),
          amount: isNaN(amount) ? 0 : Math.round(amount * 100) / 100,
          due_date: String(inv.due_date),
          type: String(inv.type || 'INF'),
          overdueDays
        });
        totalOverdueAmount += isNaN(amount) ? 0 : amount;
      }
    }
  }

  // Sort descending by overdueDays (oldest invoice first)
  overdueInvoices.sort((a, b) => b.overdueDays - a.overdueDays);

  const oldestOverdue = overdueInvoices.length > 0 ? overdueInvoices[0] : null;
  const maxOverdueDays = oldestOverdue ? oldestOverdue.overdueDays : 0;
  totalOverdueAmount = Math.round(totalOverdueAmount * 100) / 100;

  if (maxOverdueDays <= 0 || overdueInvoices.length === 0) {
    return createExemptStatus('no_overdue', {
      dunningFee,
      isMunicipal,
      isSummerMoratorium,
      baseGraceDays
    });
  }

  // 4. Map overdueDays to Dunning Level based on baseGraceDays
  const level1Threshold = baseGraceDays + 1;  // e.g. 15
  const level2Threshold = baseGraceDays + 9;  // e.g. 23
  const level3Threshold = baseGraceDays + 16; // e.g. 30
  const level4Threshold = baseGraceDays + 24; // e.g. 38
  const level5Threshold = baseGraceDays + 31; // e.g. 45

  let level: SchoolDunningLevel = 'level_0_current';
  if (maxOverdueDays >= level5Threshold) {
    level = 'level_5_full_readonly';
  } else if (maxOverdueDays >= level4Threshold) {
    level = 'level_4_teacher_warning';
  } else if (maxOverdueDays >= level3Threshold) {
    level = 'level_3_admin_readonly';
  } else if (maxOverdueDays >= level2Threshold) {
    level = 'level_2_warning';
  } else if (maxOverdueDays >= level1Threshold) {
    level = 'level_1_reminder';
  } else {
    level = 'level_0_current'; // Grace Period
  }

  // 5. Behavioral Flags (overruled by 48h Trust Extension if active)
  const isDunningFeeApplied = maxOverdueDays >= level3Threshold;
  let isSecretaryReadOnly = maxOverdueDays >= level3Threshold;
  let isAudioTresorReadOnly = maxOverdueDays >= level3Threshold;
  let isTeacherReadOnly = maxOverdueDays >= level5Threshold;

  if (isTrustExtended) {
    // 48h trust pass temporarily suspends the administrative and audio-tresor read-only lock
    isSecretaryReadOnly = false;
    isAudioTresorReadOnly = false;
  }

  // 6. Countdowns
  const adminCountdownDays = (maxOverdueDays >= level2Threshold && maxOverdueDays < level3Threshold)
    ? Math.max(1, level3Threshold - maxOverdueDays)
    : 0;

  const teacherCountdownDays = (maxOverdueDays >= level4Threshold && maxOverdueDays < level5Threshold)
    ? Math.max(1, level5Threshold - maxOverdueDays)
    : 0;

  return {
    level,
    overdueDays: maxOverdueDays,
    oldestOverdueInvoice: oldestOverdue,
    totalOverdueAmount,
    unpaidInvoicesCount: overdueInvoices.length,
    overdueInvoicesList: overdueInvoices,
    isSecretaryReadOnly,
    isAudioTresorReadOnly,
    isTeacherReadOnly,
    adminCountdownDays,
    teacherCountdownDays,
    isDelinquent: maxOverdueDays >= level1Threshold,
    isExempt: false,
    dunningFee,
    isDunningFeeApplied,
    isTrustExtended,
    trustRemainingHours,
    isKulanzActive,
    isMunicipal,
    isSummerMoratorium,
    baseGraceDays
  };
}

function createExemptStatus(
  reason: 'subscription_bypass' | 'active_trial' | 'no_overdue',
  extras?: {
    dunningFee?: number;
    isMunicipal?: boolean;
    isSummerMoratorium?: boolean;
    baseGraceDays?: number;
    isKulanzActive?: boolean;
  }
): SchoolDunningStatus {
  return {
    level: 'level_0_current',
    overdueDays: 0,
    oldestOverdueInvoice: null,
    totalOverdueAmount: 0,
    unpaidInvoicesCount: 0,
    overdueInvoicesList: [],
    isSecretaryReadOnly: false,
    isAudioTresorReadOnly: false,
    isTeacherReadOnly: false,
    adminCountdownDays: 0,
    teacherCountdownDays: 0,
    isDelinquent: false,
    isExempt: reason !== 'no_overdue',
    exemptionReason: reason,
    dunningFee: extras?.dunningFee ?? 19.90,
    isDunningFeeApplied: false,
    isTrustExtended: false,
    trustRemainingHours: 0,
    isKulanzActive: extras?.isKulanzActive ?? false,
    isMunicipal: extras?.isMunicipal ?? false,
    isSummerMoratorium: extras?.isSummerMoratorium ?? false,
    baseGraceDays: extras?.baseGraceDays ?? 28
  };
}

/**
 * Returns UI styling helpers for dunning badges and banners.
 */
export function getDunningVisualConfig(level: SchoolDunningLevel) {
  switch (level) {
    case 'level_5_full_readonly':
      return {
        badgeBg: 'rgba(239, 68, 68, 0.12)',
        badgeColor: '#dc2626',
        badgeBorder: 'rgba(239, 68, 68, 0.3)',
        title: 'Didaktischer Schreibstopp aktiv (Tag 59+)',
        severity: 'critical' as const
      };
    case 'level_4_teacher_warning':
      return {
        badgeBg: 'rgba(249, 115, 22, 0.12)',
        badgeColor: '#ea580c',
        badgeBorder: 'rgba(249, 115, 22, 0.3)',
        title: 'Vorwarnung Lehrkräfte (Tag 52–58)',
        severity: 'warning' as const
      };
    case 'level_3_admin_readonly':
      return {
        badgeBg: 'rgba(239, 68, 68, 0.1)',
        badgeColor: '#ef4444',
        badgeBorder: 'rgba(239, 68, 68, 0.25)',
        title: 'Administrativer Schreibschutz aktiv (Tag 44–51)',
        severity: 'high' as const
      };
    case 'level_2_warning':
      return {
        badgeBg: 'rgba(245, 158, 11, 0.12)',
        badgeColor: '#d97706',
        badgeBorder: 'rgba(245, 158, 11, 0.3)',
        title: 'Dringende Mahnung: 7-Tage-Vorwarnung (Tag 37–43)',
        severity: 'warning' as const
      };
    case 'level_1_reminder':
      return {
        badgeBg: 'rgba(59, 130, 246, 0.08)',
        badgeColor: '#2563eb',
        badgeBorder: 'rgba(59, 130, 246, 0.2)',
        title: 'Zahlungserinnerung (Tag 29–36)',
        severity: 'info' as const
      };
    case 'level_0_current':
    default:
      return {
        badgeBg: 'rgba(16, 185, 129, 0.08)',
        badgeColor: '#059669',
        badgeBorder: 'rgba(16, 185, 129, 0.2)',
        title: 'Fristgerecht / Kulanzphase (Tag 1–28)',
        severity: 'success' as const
      };
  }
}
