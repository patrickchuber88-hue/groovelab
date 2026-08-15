export interface School {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  created_at?: string;
  is_paused?: boolean;
  status?: string;
  is_trial?: boolean;
  trial_ends_at?: string | null;
  contract_ends_at?: string | null;
  max_teachers?: number;
  max_students?: number;
  max_songs?: number;
  limits_enabled?: boolean;
  zip_code?: string | null;
  city?: string | null;
  legal_name?: string | null;
  billing_contact_person?: string | null;
  billing_email?: string | null;
  street?: string | null;
  house_number?: string | null;
  address_addition?: string | null;
  country?: string | null;
  vat_id?: string | null;
  leitweg_id?: string | null;
  has_groovelab_subscription?: boolean;
  has_campus_subscription?: boolean;
  subscription_bypass?: boolean;
  subscription_bypass_until?: string | null;
  subscription_bypass_reason?: string | null;
  groovelab_kiosk_token?: string | null;
  campus_login_token?: string | null;
  secretary_onboarding_token?: string | null;
  custom_price_campus?: number | null;
  custom_price_groovelab?: number | null;
  custom_price_kombi?: number | null;
  custom_price_teacher?: number | null;
  custom_price_student?: number | null;
  grandfathered_campus_price?: number | null;
  grandfathered_groovelab_price?: number | null;
  grandfathered_kombi_price?: number | null;
  grandfathered_teacher_price?: number | null;
  grandfathered_student_price?: number | null;
  price_grandfathered_at?: string | null;
  custom_free_months_per_year?: number | null;
  pricing_tier_name?: string | null;
  active_students_count?: number;
  teachers_count?: number;
  is_approved?: boolean;
  [key: string]: any;
}

export interface SchoolStat {
  totalStudents: number;
  activeStudents: number;
  totalTeachers: number;
  totalSongs: number;
  hasGroovelab: boolean;
  hasCampus: boolean;
  teachers?: number;
  students?: number;
}

export interface PendingUser {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  instrument?: string;
  school_id: string;
  created_at: string;
  is_activated?: boolean;
}

export interface PricingAuditLog {
  id: string;
  changed_by: string;
  old_rates: any;
  new_rates: any;
  created_at: string;
}

export interface SpecialOffer {
  id: string;
  name: string;
  discount_percent: number;
  code: string;
  is_active: boolean;
}

export function getSubdomainOrigin(schoolName: string): string {
  const subdomain = schoolName
    .toLowerCase()
    .trim()
    .replace(/[äöüß]/g, (match) => {
      const mapping: Record<string, string> = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' };
      return mapping[match] || match;
    })
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  const host = window.location.host;
  const protocol = window.location.protocol;

  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    const port = host.split(':')[1] || '5173';
    return `${protocol}//localhost:${port}?school=${subdomain}`;
  } else {
    let cleanHost = host;
    if (cleanHost.startsWith('www.')) {
      cleanHost = cleanHost.substring(4);
    }
    let baseDomain = 'campus-groovelab.de';
    const mainDomains = ['campus-groovelab.de', 'groovelab.de', 'campus-groovelab.com'];
    for (const domain of mainDomains) {
      if (cleanHost.endsWith(domain)) {
        baseDomain = domain;
        break;
      }
    }
    return `${protocol}//${subdomain}.${baseDomain}`;
  }
}
