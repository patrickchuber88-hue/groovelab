export type FeedbackType = 'bug' | 'feature_idea' | 'support_request';
export type FeedbackStatus = 'inbox' | 'in_review' | 'planned' | 'in_progress' | 'done' | 'declined';
export type HeroOptInType = 'full' | 'school_only' | 'anonymous';

export interface FeedbackCategory {
  id: string;
  name: string;
  shortName: string;
  iconName: string;
  allowedRoles: ('admin' | 'secretary' | 'teacher' | 'student')[];
  tags: string[];
}

export interface PlatformFeedbackItem {
  id: string;
  ticket_number?: string | null;
  school_id?: string | null;
  user_id?: string | null;
  user_name?: string | null;
  school_name?: string | null;
  user_role: string;
  active_platform: string;
  type: FeedbackType;
  board_id: string;
  board_name: string;
  smart_tags: string[];
  content: string;
  hero_opt_in: HeroOptInType;
  grant_ghost_access?: boolean;
  ghost_access_expires_at?: string | null;
  target_user_id?: string | null;
  metadata?: {
    os?: string;
    browser?: string;
    viewport?: string;
    app_version?: string;
    current_route?: string;
  };
  status: FeedbackStatus;
  admin_notes?: string;
  admin_response?: string | null;
  admin_responded_at?: string | null;
  first_response_seconds?: number | null;
  sla_fulfilled?: boolean | null;
  is_user_read?: boolean;
  is_announcement_created?: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeedbackStatusMeta {
  id: FeedbackStatus;
  label: string;
  badgeColor: string;
  badgeBg: string;
  iconName: string;
  description: string;
}

export const FEEDBACK_STATUSES: FeedbackStatusMeta[] = [
  {
    id: 'inbox',
    label: 'Eingegangen',
    badgeColor: '#64748b',
    badgeBg: '#f1f5f9',
    iconName: 'Clock',
    description: 'Dein Anliegen ist bei uns eingegangen und wartet auf die Sichtung.'
  },
  {
    id: 'in_review',
    label: 'In Prüfung',
    badgeColor: '#0284c7',
    badgeBg: '#e0f2fe',
    iconName: 'Search',
    description: 'Unser Produkt-Team prüft deinen Vorschlag bzw. den Fehlerbericht.'
  },
  {
    id: 'planned',
    label: 'Auf der Roadmap',
    badgeColor: '#7c3aed',
    badgeBg: '#f3e8ff',
    iconName: 'Sparkles',
    description: 'Hervorragende Idee! Wir haben den Wunsch für ein kommendes Release eingeplant.'
  },
  {
    id: 'in_progress',
    label: 'In Umsetzung',
    badgeColor: '#d97706',
    badgeBg: '#fef3c7',
    iconName: 'Layers',
    description: 'Unsere Entwickler arbeiten aktuell aktiv an der Implementierung.'
  },
  {
    id: 'done',
    label: 'Erfolgreich umgesetzt',
    badgeColor: '#16a34a',
    badgeBg: '#dcfce7',
    iconName: 'CheckCircle2',
    description: 'Dieses Feature bzw. der Fix ist ab sofort live in Campus-Groovelab verfügbar.'
  },
  {
    id: 'declined',
    label: 'Geprüft & Archiviert',
    badgeColor: '#475569',
    badgeBg: '#f8fafc',
    iconName: 'Archive',
    description: 'Vielen Dank für den Input. Aktuell können wir diesen Vorschlag leider nicht umsetzen.'
  }
];

export interface QuickResponseTemplate {
  id: string;
  label: string;
  shortTag: string;
  category: 'sla_first_touch' | 'positive' | 'info' | 'legal' | 'scope';
  status: FeedbackStatus;
  text: string;
}

export const QUICK_RESPONSE_TEMPLATES: QuickResponseTemplate[] = [
  // ── ⚡ 60-MINUTEN FIRST TOUCH & SLA SCHNELLBAUSTEINE ──
  {
    id: 'first_touch_tech_fix',
    label: '🛠️ SLA: In technischer Prüfung',
    shortTag: 'Tech-Fix',
    category: 'sla_first_touch',
    status: 'in_review',
    text: 'Hallo! Vielen Dank für Ihren Hinweis. Unser technischer Plattformbetrieb hat Ihr Ticket erfasst und analysiert das Fehlerbild auf Ihrem Gerätetyp. Wir melden uns schnellstmöglich mit einer Lösung.'
  },
  {
    id: 'first_touch_quick_guide',
    label: '💡 SLA: Sofort-Hilfe / FAQ',
    shortTag: 'Sofort-Hilfe',
    category: 'sla_first_touch',
    status: 'done',
    text: 'Hallo! Vielen Dank für Ihre Nachricht. Diese Funktion steht Ihnen direkt in der App zur Verfügung: Bitte öffnen Sie das Menü und wählen Sie den entsprechenden Bereich aus. Bei weiteren Fragen helfen wir jederzeit gerne!'
  },
  {
    id: 'first_touch_legal_dsgvo',
    label: '🔒 SLA: DSGVO / Vertragsauskunft',
    shortTag: 'DSGVO / Recht',
    category: 'sla_first_touch',
    status: 'in_progress',
    text: 'Sehr geehrte Schulleitung, vielen Dank für Ihre Anfrage. Wir haben Ihr Anliegen aufgenommen und stellen Ihnen die gewünschten Unterlagen bzw. die DSGVO-Auskunft fristgerecht zur Verfügung.'
  },
  {
    id: 'roadmap_accept',
    label: '🚀 Roadmap-Zusage',
    shortTag: 'Roadmap',
    category: 'positive',
    status: 'planned',
    text: 'Vielen Dank für diese hervorragende Idee! Wir haben deinen Vorschlag in unsere Entwicklungs-Roadmap aufgenommen und planen die Umsetzung für eines der nächsten Updates.'
  },
  {
    id: 'in_progress',
    label: '⚡ In Umsetzung',
    shortTag: 'In Arbeit',
    category: 'positive',
    status: 'in_progress',
    text: 'Großartiger Vorschlag! Unsere Entwickler arbeiten aktuell bereits an der Umsetzung dieses Features.'
  },
  {
    id: 'bug_fixed',
    label: '✅ Bug behoben',
    shortTag: 'Behoben',
    category: 'positive',
    status: 'done',
    text: 'Danke für deinen aufmerksamen Hinweis! Wir konnten das Problem analysieren und haben den Fehler mit dem neuesten Update behoben.'
  },
  {
    id: 'declined_legal',
    label: '⚖️ Rechtlich nicht machbar',
    shortTag: 'UrhG / Recht',
    category: 'legal',
    status: 'declined',
    text: 'Vielen Dank für deinen Vorschlag! Nach eingehender juristischer und regulatorischer Prüfung (u. a. Urheberrecht/Notenvervielfältigung und B2B-Compliance) können wir diese Funktion leider nicht im Plattform-Standard abbilden.'
  },
  {
    id: 'declined_scope',
    label: '🎯 Scope & Minimalismus',
    shortTag: 'Scope',
    category: 'scope',
    status: 'declined',
    text: 'Vielen Dank für deine Idee! Um die kompromisslose Einfachheit, Geschwindigkeit und intuitive Bedienung von Campus-Groovelab für alle Nutzer zu gewährleisten, halten wir den Plattform-Kern schlank und können dieses Spezial-Feature aktuell nicht aufnehmen.'
  }
];

/**
 * Enterprise+ SLA Calculation Engine:
 * Business Hours: Monday – Friday, 09:00 – 17:00 (German Business Time).
 * Guaranteed response time: 60 minutes during business hours, or next working day by 10:00.
 */
export interface SlaCalculationResult {
  dueAt: Date;
  isWithinBusinessHours: boolean;
  displayTarget: string;
  secondsRemaining: number;
  minutesRemaining: number;
  isExpired: boolean;
  urgencyLevel: 'critical' | 'warning' | 'normal' | 'after_hours' | 'fulfilled';
  badgeColor: string;
  badgeBg: string;
  label: string;
}

export const computeSlaTarget = (
  createdAtString: string,
  respondedAtString?: string | null
): SlaCalculationResult => {
  const createdDate = new Date(createdAtString);
  const now = new Date();

  // Helper: check if day is weekend (0 = Sun, 6 = Sat)
  const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

  // Determine SLA Due Date
  const startHour = createdDate.getHours();
  const startMinute = createdDate.getMinutes();
  const isWeekday = !isWeekend(createdDate);
  const inHours = isWeekday && startHour >= 9 && (startHour < 17 || (startHour === 17 && startMinute === 0));

  let dueDate = new Date(createdDate.getTime());

  if (inHours) {
    // If created before 16:00 -> due +60 mins
    if (startHour < 16 || (startHour === 16 && startMinute === 0)) {
      dueDate = new Date(createdDate.getTime() + 60 * 60 * 1000);
    } else {
      // Created between 16:00 and 17:00 -> remaining minutes roll over to next business day 09:00
      const minutesLeftToday = (17 * 60) - (startHour * 60 + startMinute);
      const rolloverMinutes = 60 - minutesLeftToday;
      
      // Advance to next business day 09:00
      dueDate.setDate(dueDate.getDate() + 1);
      while (isWeekend(dueDate)) {
        dueDate.setDate(dueDate.getDate() + 1);
      }
      dueDate.setHours(9, rolloverMinutes, 0, 0);
    }
  } else {
    // Created after hours or on weekend -> SLA starts next business day 09:00, due by 10:00
    if (startHour >= 17) {
      dueDate.setDate(dueDate.getDate() + 1);
    }
    while (isWeekend(dueDate)) {
      dueDate.setDate(dueDate.getDate() + 1);
    }
    dueDate.setHours(10, 0, 0, 0);
  }

  // Check if already responded
  if (respondedAtString) {
    const respDate = new Date(respondedAtString);
    const diffSec = Math.max(0, Math.floor((respDate.getTime() - createdDate.getTime()) / 1000));
    const fulfilled = respDate.getTime() <= dueDate.getTime();
    return {
      dueAt: dueDate,
      isWithinBusinessHours: inHours,
      displayTarget: `Beantwortet in ${Math.round(diffSec / 60)} Min.`,
      secondsRemaining: 0,
      minutesRemaining: 0,
      isExpired: false,
      urgencyLevel: 'fulfilled',
      badgeColor: fulfilled ? '#16a34a' : '#d97706',
      badgeBg: fulfilled ? '#dcfce7' : '#fef3c7',
      label: fulfilled ? `✓ SLA erfüllt (${Math.round(diffSec / 60)} Min.)` : `✓ Beantwortet`
    };
  }

  const secondsRemaining = Math.floor((dueDate.getTime() - now.getTime()) / 1000);
  const minutesRemaining = Math.floor(secondsRemaining / 60);
  const isExpired = secondsRemaining <= 0;

  if (isExpired) {
    return {
      dueAt: dueDate,
      isWithinBusinessHours: inHours,
      displayTarget: `SLA fällig seit ${Math.abs(minutesRemaining)} Min.`,
      secondsRemaining: 0,
      minutesRemaining: 0,
      isExpired: true,
      urgencyLevel: 'critical',
      badgeColor: '#dc2626',
      badgeBg: '#fee2e2',
      label: `🚨 SLA Überschritten (${Math.abs(minutesRemaining)}m)`
    };
  }

  if (!inHours) {
    const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const dueDay = dayNames[dueDate.getDay()];
    const dueTime = `${String(dueDate.getHours()).padStart(2, '0')}:${String(dueDate.getMinutes()).padStart(2, '0')}`;
    return {
      dueAt: dueDate,
      isWithinBusinessHours: false,
      displayTarget: `Fällig ${dueDay}, ${dueTime} Uhr`,
      secondsRemaining,
      minutesRemaining,
      isExpired: false,
      urgencyLevel: 'after_hours',
      badgeColor: '#64748b',
      badgeBg: '#f1f5f9',
      label: `🌙 Ruhezeit • Fällig ${dueDay} ${dueTime}`
    };
  }

  if (minutesRemaining < 15) {
    return {
      dueAt: dueDate,
      isWithinBusinessHours: true,
      displayTarget: `Noch ${minutesRemaining} Min.`,
      secondsRemaining,
      minutesRemaining,
      isExpired: false,
      urgencyLevel: 'critical',
      badgeColor: '#dc2626',
      badgeBg: '#fee2e2',
      label: `⏱️ Noch ${minutesRemaining} Min. (Kritisch)`
    };
  }

  if (minutesRemaining < 30) {
    return {
      dueAt: dueDate,
      isWithinBusinessHours: true,
      displayTarget: `Noch ${minutesRemaining} Min.`,
      secondsRemaining,
      minutesRemaining,
      isExpired: false,
      urgencyLevel: 'warning',
      badgeColor: '#d97706',
      badgeBg: '#fef3c7',
      label: `⏳ Noch ${minutesRemaining} Min.`
    };
  }

  return {
    dueAt: dueDate,
    isWithinBusinessHours: true,
    displayTarget: `Noch ${minutesRemaining} Min.`,
    secondsRemaining,
    minutesRemaining,
    isExpired: false,
    urgencyLevel: 'normal',
    badgeColor: '#16a34a',
    badgeBg: '#dcfce7',
    label: `🟢 SLA aktiv: Noch ${minutesRemaining} Min.`
  };
};

/**
 * Format SLA Seconds cleanly into HH:MM:SS or MM:SS with clear units
 */
export const formatSlaCountdown = (seconds: number): {
  timeString: string;
  unit: string;
  isHours: boolean;
  hours: number;
  minutes: number;
  secs: number;
} => {
  const totalSeconds = Math.max(0, seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return {
      timeString: `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
      unit: 'Std.',
      isHours: true,
      hours,
      minutes,
      secs
    };
  }

  return {
    timeString: `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
    unit: 'Min.',
    isHours: false,
    hours,
    minutes,
    secs
  };
};

export interface PlatformAnnouncement {
  id: string;
  source_feedback_id?: string;
  title: string;
  summary: string;
  badge_tag: string;
  hero_credit?: string;
  target_platform: 'all' | 'campus' | 'groovelab';
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export const FEEDBACK_CATEGORIES: FeedbackCategory[] = [
  {
    id: 'schedule',
    name: 'Stundenplan & Termine',
    shortName: 'Stundenplan & Termine',
    iconName: 'Calendar',
    allowedRoles: ['admin', 'secretary', 'teacher', 'student'],
    tags: ['Stundenplan-Designer', 'Terminänderungen', 'Raumplaner', 'Veranstaltungen', 'Kalender-Sync']
  },
  {
    id: 'homework',
    name: 'Hausaufgaben & Schüler',
    shortName: 'Hausaufgaben & Schüler',
    iconName: 'BookOpen',
    allowedRoles: ['admin', 'secretary', 'teacher', 'student'],
    tags: ['Hausaufgabenheft', 'Meisterwerk-Protokoll', 'Übe-Timer & Streaks', 'Fahrpläne & Notizen', 'Schülerverwaltung']
  },
  {
    id: 'audio',
    name: 'Audio-Tresor & Studio',
    shortName: 'Audio-Tresor & Studio',
    iconName: 'Music',
    allowedRoles: ['admin', 'secretary', 'teacher', 'student'],
    tags: ['Loopstation', 'Play-Along Studio', 'Unterrichts-Aufnahmen', 'Schüler-Aufnahmen', 'Audio-Tresor & Speicher']
  },
  {
    id: 'bands',
    name: 'Bands & Repertoire',
    shortName: 'Bands & Repertoire',
    iconName: 'Users',
    allowedRoles: ['admin', 'secretary', 'teacher', 'student'],
    tags: ['Band-Verwaltung', 'Live Lab', 'Songs meistern', 'Repertoire-Planer', 'Skill-Radar & XP', 'Musiker-Avatare']
  },
  {
    id: 'admin_billing',
    name: 'Verwaltung & Finanzen',
    shortName: 'Verwaltung & Finanzen',
    iconName: 'CreditCard',
    allowedRoles: ['admin', 'secretary'],
    tags: ['Zahlungsabgleich', 'Schüler-Aktivierungen', 'Direktabrechnung (Eltern)', 'Lehrkräfte & Klassen', 'Leihinstrumente', 'Kiosk-Terminal']
  },
  {
    id: 'general',
    name: 'App, Login & Sonstiges',
    shortName: 'App, Login & Sonstiges',
    iconName: 'Settings',
    allowedRoles: ['admin', 'secretary', 'teacher', 'student'],
    tags: ['Login & PIN', 'Modul-Wechsel (Kombi)', 'App-Geschwindigkeit', 'Design & Darstellung', 'Allgemeine Idee']
  }
];

export const getAvailableCategoriesForRole = (role: string): FeedbackCategory[] => {
  const normRole = (role || 'teacher').toLowerCase();
  return FEEDBACK_CATEGORIES.filter(cat => 
    cat.allowedRoles.includes(normRole as any)
  );
};

export const formatLegalHeroCredit = (
  role: string = 'teacher',
  rawName?: string | null,
  schoolName?: string | null,
  optIn: HeroOptInType = 'school_only'
): string | null => {
  if (optIn === 'anonymous') return null;
  const cleanSchool = (schoolName || '').trim();
  const cleanName = (rawName || '').trim();

  if (optIn === 'school_only') {
    return cleanSchool ? `Idee aus der ${cleanSchool}` : 'Idee aus einer Campus-Groovelab Partner-Musikschule';
  }

  // If role is student, enforce strict GDPR child pseudonymization (First name + last initial)
  const normRole = (role || '').toLowerCase();
  if (normRole === 'student') {
    if (!cleanName) {
      return cleanSchool ? `Idee von Schüler/in (${cleanSchool})` : 'Idee von Schüler/in';
    }
    const parts = cleanName.split(/\s+/);
    const firstName = parts[0];
    const lastInitial = parts.length > 1 ? ` ${parts[parts.length - 1][0]}.` : '';
    const studentDisplayName = `${firstName}${lastInitial}`;
    return cleanSchool 
      ? `Idee von ${studentDisplayName} (${cleanSchool})` 
      : `Idee von ${studentDisplayName}`;
  }

  // For teachers and administrators: full name display
  if (!cleanName) {
    return cleanSchool ? `Idee aus der ${cleanSchool}` : 'Idee aus dem Team';
  }
  return cleanSchool 
    ? `Idee von ${cleanName} (${cleanSchool})` 
    : `Idee von ${cleanName}`;
};
