/**
 * Campus-Groovelab Enterprise BFF (Backend-for-Frontend) Client
 * 
 * Encapsulates all domain and data fetching logic behind strongly-typed DTOs.
 * Eliminates direct table queries from presentation components.
 */

import { supabase } from '../lib/supabase';

export interface StudentProfileDTO {
  id: string;
  schoolId: string;
  schoolName: string;
  schoolSubdomain: string;
  displayName: string;
  instrument: string;
  photoUrl: string | null;
  xpPoints: number;
  streakDays: number;
  lastPracticeDate: string | null;
  customStreakGoal: number | null;
  isCampusActive: boolean;
  isGroovelabActive: boolean;
  schoolSubscriptions: {
    campus: boolean;
    groovelab: boolean;
  };
}

export interface SchoolRosterItemDTO {
  id: string;
  displayName: string;
  role: 'teacher' | 'admin' | 'secretary' | 'student';
  instrument: string;
  photoUrl: string | null;
  isCampusActive: boolean;
  isGroovelabActive: boolean;
  teacherId?: string;
}

export interface SchoolRosterDTO {
  schoolId: string;
  teachers: SchoolRosterItemDTO[];
  students: SchoolRosterItemDTO[];
}

export interface PracticeSessionResultDTO {
  success: boolean;
  earnedXp: number;
  totalXp: number;
  streakDays: number;
  practicedToday: boolean;
}

export interface InvoiceLineItemDTO {
  position: number;
  title: string;
  unitPrice: string;
  amountCents: number;
}

export interface InvoicePreviewDTO {
  schoolId: string;
  lineItems: InvoiceLineItemDTO[];
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  formattedSubtotal: string;
  formattedVat: string;
  formattedTotal: string;
}

/**
 * Fetches authenticated student profile DTO without direct table query.
 */
export async function getStudentProfileDTO(userId: string): Promise<StudentProfileDTO | null> {
  if (!userId) return null;
  const { data, error } = await supabase.rpc('get_authenticated_student_profile', { p_user_id: userId });
  if (error || !data) {
    console.warn('[BFF] getStudentProfileDTO notice:', error);
    return null;
  }
  return data as StudentProfileDTO;
}

/**
 * Fetches anonymized school roster DTO.
 */
export async function getSchoolRosterDTO(schoolId: string): Promise<SchoolRosterDTO | null> {
  if (!schoolId) return null;
  const { data, error } = await supabase.rpc('get_school_roster_dto', { p_school_id: schoolId });
  if (error || !data) {
    console.warn('[BFF] getSchoolRosterDTO notice:', error);
    return null;
  }
  return data as SchoolRosterDTO;
}

/**
 * Submits practice session duration to the server for atomic XP and streak calculation.
 */
export async function recordPracticeSessionDTO(
  studentId: string,
  durationSeconds: number,
  activityType = 'practice'
): Promise<PracticeSessionResultDTO | null> {
  if (!studentId || durationSeconds <= 0) return null;
  const { data, error } = await supabase.rpc('record_practice_session_event', {
    p_student_id: studentId,
    p_duration_seconds: durationSeconds,
    p_activity_type: activityType
  });
  if (error || !data) {
    console.warn('[BFF] recordPracticeSessionDTO notice:', error);
    return null;
  }
  return data as PracticeSessionResultDTO;
}

export interface SchoolProfileDTO {
  id: string;
  name: string;
  subdomain: string;
  logoUrl: string | null;
  city: string | null;
  street?: string | null;
  zipCode?: string | null;
  email?: string | null;
  representedBy?: string | null;
  hasCampusSubscription: boolean;
  hasGroovelabSubscription: boolean;
}

/**
 * Fetches sanitized school profile DTO with resilient fallback.
 */
export async function getSchoolProfileDTO(schoolId: string): Promise<SchoolProfileDTO | null> {
  if (!schoolId) return null;
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_school_profile_dto', { p_school_id: schoolId });
    if (!rpcErr && rpcData) {
      return rpcData as SchoolProfileDTO;
    }
  } catch (e) {}

  // Resilient fallback to direct select
  try {
    const { data, error } = await supabase
      .from('schools')
      .select('id, name, subdomain, logo_url, city, street, zip_code, email, represented_by, has_campus_subscription, has_groovelab_subscription')
      .eq('id', schoolId)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      name: data.name,
      subdomain: data.subdomain,
      logoUrl: data.logo_url,
      city: data.city,
      street: data.street,
      zipCode: data.zip_code,
      email: data.email,
      representedBy: data.represented_by,
      hasCampusSubscription: Boolean(data.has_campus_subscription),
      hasGroovelabSubscription: Boolean(data.has_groovelab_subscription)
    };
  } catch (err) {
    console.warn('[BFF] getSchoolProfileDTO notice:', err);
    return null;
  }
}

/**
 * Fetches canonical SaaS invoice preview calculated 100% on the server.
 */
export async function getInvoicePreviewDTO(schoolId: string): Promise<InvoicePreviewDTO | null> {
  if (!schoolId) return null;
  const { data, error } = await supabase.rpc('get_invoice_preview_dto', { p_school_id: schoolId });
  if (error || !data) {
    console.warn('[BFF] getInvoicePreviewDTO notice:', error);
    return null;
  }
  return data as InvoicePreviewDTO;
}

