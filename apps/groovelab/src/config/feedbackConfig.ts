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
  category: 'positive' | 'info' | 'legal' | 'scope';
  status: FeedbackStatus;
  text: string;
}

export const QUICK_RESPONSE_TEMPLATES: QuickResponseTemplate[] = [
  {
    id: 'roadmap_accept',
    label: 'Roadmap-Zusage',
    category: 'positive',
    status: 'planned',
    text: 'Vielen Dank für diese hervorragende Idee! Wir haben deinen Vorschlag in unsere Entwicklungs-Roadmap aufgenommen und planen die Umsetzung für eines der nächsten Updates.'
  },
  {
    id: 'in_progress',
    label: 'In Umsetzung',
    category: 'positive',
    status: 'in_progress',
    text: 'Großartiger Vorschlag! Unsere Entwickler arbeiten aktuell bereits an der Umsetzung dieses Features.'
  },
  {
    id: 'bug_fixed',
    label: 'Bug behoben',
    category: 'positive',
    status: 'done',
    text: 'Danke für deinen aufmerksamen Hinweis! Wir konnten das Problem analysieren und haben den Fehler mit dem neuesten Update behoben.'
  },
  {
    id: 'tip_available',
    label: 'Bereits möglich',
    category: 'info',
    status: 'done',
    text: 'Vielen Dank für deine Nachricht! Diese Funktion ist bereits im System verfügbar oder lässt sich über die entsprechenden Einstellungen anpassen.'
  },
  {
    id: 'declined_legal',
    label: 'Rechtlich nicht machbar',
    category: 'legal',
    status: 'declined',
    text: 'Vielen Dank für deinen Vorschlag! Nach eingehender juristischer und regulatorischer Prüfung (u. a. Urheberrecht/GEMA, B2B-Schulvertragsrecht und Compliance) können wir diese Funktion leider nicht rechtssicher im Plattform-Standard abbilden. Wir danken dir dennoch herzlich für deinen engagierten Beitrag zur Plattform!'
  },
  {
    id: 'declined_gdpr',
    label: 'Datenschutz-Absage',
    category: 'legal',
    status: 'declined',
    text: 'Herzlichen Dank für deinen Input. Zum Schutz der strengen DSGVO- und Datenschutzstandards für Schulen und Minderjährige (Datenminimierung & Kinderschutz) können wir dieses Feature in dieser Form leider nicht anbieten.'
  },
  {
    id: 'declined_scope',
    label: 'Scope & Minimalismus',
    category: 'scope',
    status: 'declined',
    text: 'Vielen Dank für deine Idee! Um die kompromisslose Einfachheit, Geschwindigkeit und intuitive Bedienung von Campus-Groovelab für alle Lehrkräfte und Schüler zu gewährleisten, halten wir den Plattform-Kern schlank und können dieses Spezial-Feature aktuell nicht aufnehmen.'
  }
];

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
