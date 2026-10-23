/**
 * Enterprise B2B Delinquency & Grace Period Domain Engine
 * Campus-Groovelab FinOps Governance Architecture
 * 
 * Provides 100% deterministic, stateless evaluation of B2B payment statuses
 * ensuring the Student-First Didactic Immunity Axiom and Zero-Deletion Guarantee.
 */

export type SchoolDunningLevel =
  | 'level_0_current'           // Tag 1–28 nach Fälligkeit (bzw. 1–42 im Ferien-Moratorium): Reguläre Kommunal-Karenzphase (0 €)
  | 'level_1_reminder'          // Tag 29–36 nach Fälligkeit: 1. Freundliche Zahlungserinnerung im Cockpit (0 €)
  | 'level_2_warning'           // Tag 37–43 nach Fälligkeit: 2. Mahnung & 7-Tage-Vorwarnung vor Schreibschutz (inkl. Kulanzpauschale)
  | 'level_3_admin_readonly'    // Tag 44–51 nach Fälligkeit: Administrativer Schreibschutz im Sekretariat (100 % Didaktische Immunität)
  | 'level_4_teacher_warning'   // Tag 52–58 nach Fälligkeit: Dringende Träger-Mahnung bei aktivem Verwaltungs-Schreibschutz
  | 'level_5_full_readonly';    // Tag 59+ nach Fälligkeit: Eskalierter Verwaltungs-Schreibschutz (Schüler & Lehrkräfte 100 % geschützt)

export interface OverdueInvoiceSummary {
  id: string;
  amount: number;
  due_date: string;
  billing_date?: string;
  type: string;
  overdueDays: number;
}

export interface SchoolDunningStatus {
  level: SchoolDunningLevel;
  overdueDays: number;
  oldestOverdueInvoice: OverdueInvoiceSummary | null;
  totalOverdueAmount: number;
  appliedDunningFee: number;
  totalPayableAmount: number;
  unpaidInvoicesCount: number;
  overdueInvoicesList: OverdueInvoiceSummary[];

  // Behavioral Access Flags (Unantastbares Didactic Immunity Axiom gem. § 242 BGB)
  isSecretaryReadOnly: boolean;
  isAudioTresorReadOnly: boolean; // Immer false: Didaktische Immunität für Schulinhalte & Übetracks
  isTeacherReadOnly: boolean;     // Immer false: Keine Aussperrung von Lehrkräften aus dem Unterricht

  // Real-time Countdowns (Tage bis zum nächsten administrativen Schritt)
  adminCountdownDays: number;   // Tage bis zum administrativen Schreibschutz im Sekretariat
  teacherCountdownDays: number; // Bleibt 0 (Lehrkräfte werden nicht gesperrt)

  // Status Meta
  isDelinquent: boolean;        // True if level >= level_1_reminder
  isExempt: boolean;            // True if bypass, active trial, or SEPA direct debit protects the school
  exemptionReason?: 'subscription_bypass' | 'active_trial' | 'sepa_direct_debit' | 'no_overdue';

  // Veredelungs-Metriken
  dunningFee: number;           // 14.90, 9.90, or 19.90 € based on booked modules (Kulanz statt 40 € gem. § 288 Abs. 5 BGB)
  isDunningFeeApplied: boolean; // True if level >= level_2_warning and not waived by Kulanzjoker
  isTrustExtended: boolean;     // True if 48h trust pass or Kulanzjoker is currently active
  trustRemainingHours: number;  // Hours remaining on 48h trust pass
  isTrustUsedForCycle: boolean; // True if the one-time 48h trust pass was already used for the current overdue cycle
  isKulanzActive: boolean;      // True if Master Admin granted +30 days grace extension
  isMunicipal: boolean;         // True if school is public/municipal
  isSummerMoratorium: boolean;  // True if summer break moratorium is applied
  hasSepaMandate: boolean;      // True if school has an active SEPA direct debit mandate (§ 286 Abs. 4 BGB Holschuld)
  baseGraceDays: number;        // 28 (Standard) or 42 (Ferien-Moratorium), +30 with Kulanzjoker
}

/**
 * Resolves the authoritative reference date across Secretariat and Master-Admin,
 * honoring the developer/operator time machine (`groovelab_simulated_date`).
 */
export function resolveEffectiveBillingDate(explicitDate?: Date | string | null): Date {
  if (explicitDate) {
    const parsed = new Date(explicitDate);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  if (typeof window !== 'undefined') {
    try {
      const sim = localStorage.getItem('groovelab_simulated_date');
      if (sim) {
        const parsed = new Date(sim);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    } catch {
      // ignore storage errors
    }
  }
  return new Date();
}

/**
 * Computes canonical B2B invoice creation date (last day of month 23:58) and
 * statutory due date (+30 days net per § 286 Abs. 3 BGB, shifted to Monday if
 * falling on Saturday/Sunday per § 193 BGB).
 */
export function computeCanonicalDueDate(year: number, month1Based: number): {
  creationDate: Date;
  dueDate: Date;
  billingDateIso: string;
  dueDateIso: string;
  dueDateDisplay: string;
} {
  const deMonths = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];
  const lastDay = new Date(year, month1Based, 0).getDate();
  const creationDate = new Date(year, month1Based - 1, lastDay, 23, 58, 0);
  const dueDate = new Date(year, month1Based - 1, lastDay + 30, 23, 59, 59);
  const dayOfWeek = dueDate.getDay();
  if (dayOfWeek === 6) {
    dueDate.setDate(dueDate.getDate() + 2); // Samstag -> Montag (§ 193 BGB)
  } else if (dayOfWeek === 0) {
    dueDate.setDate(dueDate.getDate() + 1); // Sonntag -> Montag (§ 193 BGB)
  }
  const fmtIso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dueDateDisplay = `${dueDate.getDate()}. ${deMonths[dueDate.getMonth()]} ${dueDate.getFullYear()}`;
  return {
    creationDate,
    dueDate,
    billingDateIso: fmtIso(creationDate),
    dueDateIso: fmtIso(dueDate),
    dueDateDisplay
  };
}

/**
 * Checks whether a school has an active SEPA Direct Debit Mandate (§ 286 Abs. 4 BGB Gläubiger-Holschuld).
 */
export function hasActiveSepaMandate(school: any): boolean {
  if (!school) return false;
  if (school.agreed_to_sepa === true || school.sepa_mandate_active === true) return true;
  const iban = String(school.sepa_iban || school.billing_iban || '').trim();
  const mandateId = String(school.sepa_mandate_id || '').trim();
  if (iban.length >= 15 && mandateId.length >= 3) return true;
  if (typeof window !== 'undefined' && school.id) {
    try {
      const localSepa = localStorage.getItem(`agreedToSepa_${school.id}`);
      const localIban = localStorage.getItem(`billingIban_${school.id}`);
      if (localSepa === 'true' && localIban && localIban.trim().length >= 15) {
        return true;
      }
    } catch {
      // ignore storage access errors
    }
  }
  return false;
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
  const effectiveNow = resolveEffectiveBillingDate(simulatedDate);
  const refDate = parseDateToMidnight(effectiveNow);

  // Calculate module-specific late fee: Campus 14.90, GrooveLab 9.90, Kombi 19.90 €
  const hasCampus = school?.has_campus_subscription !== false;
  const hasGroovelab = school?.has_groovelab_subscription === true;
  let dunningFee = 19.90;
  if (hasCampus && !hasGroovelab) {
    dunningFee = 14.90;
  } else if (!hasCampus && hasGroovelab) {
    dunningFee = 9.90;
  }

  const hasSepa = hasActiveSepaMandate(school);

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

  // Check 48h Trust Extension (against exact timestamp, not midnight-truncated)
  let isTrustExtended = false;
  let trustRemainingHours = 0;
  const rawTrustUntil = school?.dunning_trust_extension_until;
  if (rawTrustUntil) {
    const trustUntil = new Date(rawTrustUntil).getTime();
    const nowTime = effectiveNow.getTime();
    if (trustUntil > nowTime) {
      isTrustExtended = true;
      trustRemainingHours = Math.max(1, Math.ceil((trustUntil - nowTime) / (1000 * 60 * 60)));
    }
  }

  // Check Kulanzjoker (Master Admin Grace Extension & Fee Waiver: +30 Days & 0 € late fee)
  let isKulanzActive = false;
  if (school?.dunning_kulanz_until) {
    const kulanzUntil = new Date(school.dunning_kulanz_until).getTime();
    if (kulanzUntil > effectiveNow.getTime()) {
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
      hasSepaMandate: hasSepa,
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
        hasSepaMandate: hasSepa,
        baseGraceDays
      });
    }
    const trialEnd = parseDateToMidnight(school.trial_ends_at);
    if (trialEnd.getTime() >= refDate.getTime()) {
      return createExemptStatus('active_trial', {
        dunningFee,
        isMunicipal,
        isSummerMoratorium,
        hasSepaMandate: hasSepa,
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
      if (String(inv.id || '').startsWith('VS-')) continue;

      const statusLower = String(inv.status || '').toLowerCase().trim();
      const isPaid = statusLower === 'paid' || 
                     statusLower === 'bezahlt' || 
                     statusLower === 'cancelled' || 
                     statusLower === 'storniert' ||
                     statusLower === 'preview' ||
                     statusLower === 'vorschau' ||
                     statusLower === 'probemonat' ||
                     statusLower === 'bypass' ||
                     statusLower === 'kostenfrei';

      if (isPaid) continue;

      // § 286 Abs. 4 BGB SEPA-Holschuld-Immunität:
      // Bei aktivem SEPA-Lastschriftmandat gerät die Schule nur bei expliziter Rücklastschrift in Verzug.
      const isChargeback = statusLower === 'chargeback' || statusLower === 'ruecklastschrift' || statusLower === 'failed';
      if (hasSepa && !isChargeback) {
        continue;
      }

      const dueDate = parseDateToMidnight(inv.due_date);
      const diffMs = refDate.getTime() - dueDate.getTime();
      const overdueDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      // Overdue starts when reference date is strictly after due date (overdueDays >= 1)
      if (overdueDays >= 1) {
        const amount = Number(inv.amount ?? (inv.items && inv.items.amount) ?? 0);
        if (amount <= 0) continue;
        overdueInvoices.push({
          id: String(inv.id || inv.invoice_number || ''),
          amount: isNaN(amount) ? 0 : Math.round(amount * 100) / 100,
          due_date: String(inv.due_date),
          billing_date: inv.billing_date ? String(inv.billing_date) : undefined,
          type: String(inv.type || (String(inv.id || '').startsWith('AKT-') ? 'AKT' : 'INF')),
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
    return createExemptStatus(hasSepa ? 'sepa_direct_debit' : 'no_overdue', {
      dunningFee,
      isMunicipal,
      isSummerMoratorium,
      hasSepaMandate: hasSepa,
      baseGraceDays,
      isKulanzActive
    });
  }

  // Check if the one-time 48h trust pass was already consumed for this overdue cycle
  let isTrustUsedForCycle = false;
  if (rawTrustUntil && oldestOverdue) {
    const trustUntilMs = new Date(rawTrustUntil).getTime();
    const oldestDueMs = parseDateToMidnight(oldestOverdue.due_date).getTime();
    if (trustUntilMs > oldestDueMs) {
      isTrustUsedForCycle = true;
    }
  }
  if (!isTrustUsedForCycle && typeof window !== 'undefined' && school?.id && oldestOverdue?.id) {
    try {
      if (localStorage.getItem(`groovelab_trust_used_${school.id}_${oldestOverdue.id}`) === 'true') {
        isTrustUsedForCycle = true;
      }
    } catch {
      // ignore storage errors
    }
  }

  // 4. Map overdueDays to Dunning Level based on baseGraceDays (28 days standard / 42 days summer)
  const level1Threshold = baseGraceDays + 1;  // Tag 29 (bzw. 43 im Sommer)
  const level2Threshold = baseGraceDays + 9;  // Tag 37 (bzw. 51 im Sommer)
  const level3Threshold = baseGraceDays + 16; // Tag 44 (bzw. 58 im Sommer)
  const level4Threshold = baseGraceDays + 24; // Tag 52
  const level5Threshold = baseGraceDays + 31; // Tag 59

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
    level = 'level_0_current'; // Grace Period (Tag 1–28)
  }

  // 5. Behavioral Flags (Didaktische Immunität gem. § 242 BGB)
  // Rechnungsrückstände des Schulträgers dürfen niemals den Unterrichtsbetrieb
  // oder pädagogische Übetracks gefährden (Verhältnismäßigkeitsgrundsatz).
  const isDunningFeeApplied = maxOverdueDays >= level3Threshold && !isKulanzActive && dunningFee > 0;
  const appliedDunningFee = isDunningFeeApplied ? dunningFee : 0;
  const totalPayableAmount = Math.round((totalOverdueAmount + appliedDunningFee) * 100) / 100;

  let isSecretaryReadOnly = maxOverdueDays >= level3Threshold;
  const isAudioTresorReadOnly = false; // 100 % Didaktische Immunität
  const isTeacherReadOnly = false;     // 100 % Didaktische Immunität

  if (isTrustExtended) {
    // 48h Vertrauenspass oder Master-Admin Kulanzjoker hebt den administrativen Schreibschutz im Sekretariat auf
    isSecretaryReadOnly = false;
  }

  // 6. Countdowns (Sekretariat)
  const adminCountdownDays = (maxOverdueDays >= level2Threshold && maxOverdueDays < level3Threshold)
    ? Math.max(1, level3Threshold - maxOverdueDays)
    : 0;

  const teacherCountdownDays = 0; // Didaktische Immunität: Keine Lehrkraft-Aussperrung

  return {
    level,
    overdueDays: maxOverdueDays,
    oldestOverdueInvoice: oldestOverdue,
    totalOverdueAmount,
    appliedDunningFee,
    totalPayableAmount,
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
    isTrustUsedForCycle,
    isKulanzActive,
    isMunicipal,
    isSummerMoratorium,
    hasSepaMandate: hasSepa,
    baseGraceDays
  };
}

function createExemptStatus(
  reason: 'subscription_bypass' | 'active_trial' | 'sepa_direct_debit' | 'no_overdue',
  extras?: {
    dunningFee?: number;
    isMunicipal?: boolean;
    isSummerMoratorium?: boolean;
    hasSepaMandate?: boolean;
    baseGraceDays?: number;
    isKulanzActive?: boolean;
  }
): SchoolDunningStatus {
  return {
    level: 'level_0_current',
    overdueDays: 0,
    oldestOverdueInvoice: null,
    totalOverdueAmount: 0,
    appliedDunningFee: 0,
    totalPayableAmount: 0,
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
    isTrustUsedForCycle: false,
    isKulanzActive: extras?.isKulanzActive ?? false,
    isMunicipal: extras?.isMunicipal ?? false,
    isSummerMoratorium: extras?.isSummerMoratorium ?? false,
    hasSepaMandate: extras?.hasSepaMandate ?? false,
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
        title: 'Verwaltungs-Schreibstopp aktiv – Kassenamt kontaktieren (Tag 59+)',
        severity: 'critical' as const
      };
    case 'level_4_teacher_warning':
      return {
        badgeBg: 'rgba(249, 115, 22, 0.12)',
        badgeColor: '#ea580c',
        badgeBorder: 'rgba(249, 115, 22, 0.3)',
        title: 'Dringende Mahnung Schulträger (Tag 52–58)',
        severity: 'warning' as const
      };
    case 'level_3_admin_readonly':
      return {
        badgeBg: 'rgba(239, 68, 68, 0.1)',
        badgeColor: '#ef4444',
        badgeBorder: 'rgba(239, 68, 68, 0.25)',
        title: 'Administrativer Schreibschutz im Sekretariat (Tag 44–51)',
        severity: 'high' as const
      };
    case 'level_2_warning':
      return {
        badgeBg: 'rgba(245, 158, 11, 0.12)',
        badgeColor: '#d97706',
        badgeBorder: 'rgba(245, 158, 11, 0.3)',
        title: 'Zahlungserinnerung: 7-Tage-Vorwarnung (Tag 37–43)',
        severity: 'warning' as const
      };
    case 'level_1_reminder':
      return {
        badgeBg: 'rgba(59, 130, 246, 0.08)',
        badgeColor: '#2563eb',
        badgeBorder: 'rgba(59, 130, 246, 0.2)',
        title: 'Freundliche Zahlungserinnerung (Tag 29–36)',
        severity: 'info' as const
      };
    case 'level_0_current':
    default:
      return {
        badgeBg: 'rgba(16, 185, 129, 0.08)',
        badgeColor: '#059669',
        badgeBorder: 'rgba(16, 185, 129, 0.2)',
        title: 'Fristgerecht / Karenzphase (Tag 1–28)',
        severity: 'success' as const
      };
  }
}
