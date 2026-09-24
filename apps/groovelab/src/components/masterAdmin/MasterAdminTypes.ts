export interface ServerMetric {
  id: string;
  created_at: string;
  cpu_load: number;
  mem_used_mb: number;
  mem_total_mb: number;
  swap_used_mb?: number;
  active_connections: number;
  disk_used_gb?: number;
  disk_total_gb?: number;
  volume_used_gb?: number;
  volume_total_gb?: number;
}

export interface LoadTier {
  id: string;
  name: string;
  schools: number;
  users: number;
  peakUsers: number;
  targetRps: number;
  totalRequests: number;
  badge: string;
  hardwareFit: string;
  recommendedHardware: string;
  description: string;
}

export const LOAD_TIERS: LoadTier[] = [
  {
    id: 'tier_1',
    name: '3 Schulen',
    schools: 3,
    users: 1500,
    peakUsers: 75,
    targetRps: 15,
    totalRequests: 450,
    badge: '1.500 Nutzer',
    hardwareFit: '🟢 Hetzner CX23 (Ideal)',
    recommendedHardware: 'Hetzner Cloud CX23 (2 vCPU, 4 GB RAM) arbeitet im optimalen Ruhezustand (CPU-Last ca. 12%).',
    description: 'Regionale Musikschul-Kooperation mit 3 Standorten.'
  },
  {
    id: 'tier_2',
    name: '10 Schulen',
    schools: 10,
    users: 5000,
    peakUsers: 250,
    targetRps: 50,
    totalRequests: 1500,
    badge: '5.000 Nutzer',
    hardwareFit: '🟢 Hetzner CX23 (Optimal)',
    recommendedHardware: 'Hetzner Cloud CX23 (2 vCPU, 4 GB RAM) meistert 5.000 User mühelos (CPU-Last ca. 28%).',
    description: 'Kreisverband / städtischer Verbund mit 10 aktiven Musikschulen.'
  },
  {
    id: 'tier_3',
    name: '50 Schulen',
    schools: 50,
    users: 25000,
    peakUsers: 1250,
    targetRps: 250,
    totalRequests: 7500,
    badge: '25.000 Nutzer',
    hardwareFit: '🟡 Hetzner CX23 (Gute Auslastung)',
    recommendedHardware: 'Hetzner Cloud CX23 läuft bei ca. 65% Auslastung. Spitzenzeiten werden stabil verarbeitet.',
    description: 'Großstadt-Netzwerk / Landesverband mit 25.000 Schülern.'
  },
  {
    id: 'tier_4',
    name: '100 Schulen',
    schools: 100,
    users: 50000,
    peakUsers: 2500,
    targetRps: 500,
    totalRequests: 15000,
    badge: '50.000 Nutzer',
    hardwareFit: '🟠 Upgrade auf CX32 empfohlen',
    recommendedHardware: 'Hetzner Cloud CX32 (4 vCPU, 8 GB RAM) wird für 100 Schulen und 50.000 Schüler für P95 < 25ms empfohlen.',
    description: 'Bundeslandweites Musikschul-Portal mit 50.000 Schülern.'
  },
  {
    id: 'tier_5',
    name: '500 Schulen',
    schools: 500,
    users: 250000,
    peakUsers: 12500,
    targetRps: 2500,
    totalRequests: 75000,
    badge: '250.000 Nutzer',
    hardwareFit: '🟣 Dedicated Cluster (Hetzner AX)',
    recommendedHardware: 'Dedicated Server Cluster (Hetzner AX-Linie mit Load-Balancer) für 250.000 Schüler empfohlen.',
    description: 'Bundesweites Verbands-Ökosystem mit 250.000 Schülern.'
  }
];

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
  operator_notes?: string | null;
  invite_token?: string | null;
  invite_expires_at?: string | null;
  avv_signed_at?: string | null;
  avv_signee_name?: string | null;
  phone_number?: string | null;
  last_session_at?: string | null;
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
  ausweis_nummer?: string;
  is_campus_active?: boolean;
  is_groovelab_active?: boolean;
  is_trial?: boolean;
  is_hardship_exempt?: boolean;
  student_billing_payment_method?: string;
  student_billing_cash_paid?: boolean;
  payment_status?: string;
  last_seen?: string;
  operator_notes?: string;
  [key: string]: any;
}

export interface PricingAuditLog {
  id: string;
  changed_by: string;
  old_rates: any;
  new_rates: any;
  currency?: 'EUR' | 'CHF' | 'ALL';
  scope?: string;
  reason?: string;
  created_at: string;
}

export interface SpecialOffer {
  id: string;
  name: string;
  discount_percent: number;
  code: string;
  is_active: boolean;
  currency?: 'EUR' | 'CHF' | 'ALL';
  discount_scope?: 'hosting_only' | 'total_invoice';
  offer_type?: 'promocode' | 'founder' | 'annual' | 'free_quota';
  duration_months?: number;
  max_redemptions?: number;
  redeemed_school_ids?: string[];
  expires_at?: string | null;
  is_archived?: boolean;
  archived_at?: string | null;
  created_at?: string;
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

export type MasterAdminPortalTab = 
  | 'executive' 
  | 'schools' 
  | 'briefing' 
  | 'billing' 
  | 'telemetry' 
  | 'pricing' 
  | 'trust_safety' 
  | 'operator' 
  | 'maintenance' 
  | 'backup' 
  | 'feedback';
