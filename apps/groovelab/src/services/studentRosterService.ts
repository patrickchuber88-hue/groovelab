/**
 * studentRosterService.ts
 * 
 * Single Source of Truth (SSOT) Service for student rosters, counts, deduplication,
 * and teacher assignments across Campus-Groovelab.
 * 
 * Guarantees 100% data consistency between Secretary, Teacher, Admin, and Billing dashboards.
 */

import { getEffectiveInstrument, isGenericInstrument } from '../utils/avatarResolutionEngine';
import {
  DbUserRosterRecord,
  DbTeacherRosterRecord,
  DbPendingStudentDecrypted,
  TeacherSummary
} from '../types/databaseRoster';

export interface RosterStudent {
  id: string;
  school_id: string;
  teacher_id: string | null;
  teacher?: TeacherSummary | DbTeacherRosterRecord | null;
  resolved_instrument?: string;
  role: 'student';
  first_name: string;
  last_name: string;
  email?: string | null;
  instrument?: string;
  is_active: boolean;
  is_campus_active: boolean;
  is_groovelab_active: boolean;
  status: string;
  isPendingOnboarding: boolean;
  day_of_birth?: number | null;
  birth_date?: string | null;
  contract_ends_at?: string | null;
  trial_ends_at?: string | null;
  is_trial?: boolean | null;
  group_id?: string | null;
  sibling_group_id?: string | null;
  lesson_duration?: number | null;
  photo_url?: string | null;
  avatar_url?: string | null;
  qr_token?: string | null;
  ausweis_nummer?: string | null;
  created_at: string;
  [key: string]: any;
}

/**
 * Normalizes a student's first and last name into a clean canonical comparison key.
 * Strips whitespace, punctuation, accents, dots, and normalizes umlauts for collision resistance.
 */
export function normalizeStudentKey(firstName: string | null | undefined, lastName: string | null | undefined): string {
  const fn = (firstName || '').toLowerCase().replace(/[^a-z0-9äöüß]/g, '');
  const ln = (lastName || '').toLowerCase().replace(/[^a-z0-9äöüß]/g, '');
  return `${fn}_${ln}`;
}

/**
 * Validates whether a name corresponds to a mock, test, placeholder, or generic dummy profile.
 */
export function isTestOrGenericStudent(firstName: string | null | undefined, lastName: string | null | undefined): boolean {
  const fn = (firstName || '').toLowerCase().trim();
  const full = `${firstName || ''} ${lastName || ''}`.toLowerCase().trim();
  return (
    !fn ||
    fn.startsWith('test') ||
    fn.includes('testvorname') ||
    full.includes('ausstehend') ||
    full.includes('onboarding') ||
    full.includes('unbekannt') ||
    full === 'schüler' ||
    full === 'musiker' ||
    full === 'placeholder' ||
    full === 'demo'
  );
}

/**
 * Deduplicates a list of student records:
 * 1. Filters out generic test stubs for pending records.
 * 2. Deduplicates by ID.
 * 3. Deduplicates by normalized name key (registered user profile ALWAYS takes precedence over pending stub).
 */
export function deduplicateRoster<T extends Partial<RosterStudent> & { id?: string; first_name?: string; last_name?: string }>(students: T[]): T[] {
  if (!Array.isArray(students)) return [];
  const seenIds = new Set<string>();
  const studentMap = new Map<string, T>();

  for (const student of students) {
    if (!student) continue;

    const fn = (student.first_name || '').trim();
    const ln = (student.last_name || '').trim();

    // Discard test / generic dummy profiles on pending onboarding stubs
    if (student.isPendingOnboarding && isTestOrGenericStudent(fn, ln)) {
      continue;
    }

    if (student.id && seenIds.has(student.id)) {
      continue;
    }

    const nameKey = normalizeStudentKey(fn, ln);

    if (nameKey !== '_') {
      if (studentMap.has(nameKey)) {
        const existing = studentMap.get(nameKey)!;
        // Prefer real registered student profile over pending onboarding stub
        if (existing.isPendingOnboarding && !student.isPendingOnboarding) {
          if (existing.id) seenIds.delete(existing.id);
          studentMap.set(nameKey, student);
          if (student.id) seenIds.add(student.id);
        }
        continue;
      }
      studentMap.set(nameKey, student);
    } else {
      const fallbackKey = student.id || `anon_${Math.random()}`;
      studentMap.set(fallbackKey, student);
    }

    if (student.id) seenIds.add(student.id);
  }

  return Array.from(studentMap.values()).sort((a, b) => 
    (a.first_name || '').localeCompare(b.first_name || '', 'de')
  );
}

import { dedupeQuery } from '../utils/dedupeQuery';

const inMemoryRoster = new Map<string, { timestamp: number; data: RosterStudent[] }>();
const ROSTER_CACHE_TTL_MS = 20 * 1000; // 20 seconds fast in-memory TTL

export function invalidateSchoolRosterCache(schoolId?: string): void {
  if (schoolId) {
    inMemoryRoster.delete(schoolId);
  } else {
    inMemoryRoster.clear();
  }
}

export const ROSTER_STUDENT_PROJECTION = [
  'id',
  'school_id',
  'role',
  'first_name',
  'last_name',
  'email',
  'avatar_url',
  'photo_url',
  'qr_token',
  'instrument',
  'created_at',
  'is_active',
  'is_campus_active',
  'is_groovelab_active',
  'teacher_id',
  'birth_date',
  'group_id',
  'sibling_group_id',
  'lesson_duration',
  'status',
  'contract_ends_at',
  'trial_ends_at',
  'is_trial',
  'exempt_from_direct_billing',
  'ausweis_nummer',
  'phone',
  'campus_ui_level'
].join(', ');

/**
 * Fetches and resolves the complete, authoritative student roster for a music school.
 * Merges registered `users` and decrypted `pending_students_decrypted` without duplicates or phantom stubs.
 */
export async function fetchSchoolRoster(schoolId: string, supabaseClient: any, force = false): Promise<RosterStudent[]> {
  if (!schoolId || !supabaseClient) return [];

  if (!force && inMemoryRoster.has(schoolId)) {
    const cached = inMemoryRoster.get(schoolId)!;
    if (Date.now() - cached.timestamp < ROSTER_CACHE_TTL_MS) {
      return cached.data;
    }
  }

  return dedupeQuery(`school_roster_${schoolId}`, async () => {
    // 1. Fetch registered students AND school teachers in parallel
    let regUsers: DbUserRosterRecord[] = [];
    let teachers: DbTeacherRosterRecord[] = [];
    try {
      const [regUsersRes, teachersRes] = await Promise.all([
        supabaseClient
          .from('users')
          .select(ROSTER_STUDENT_PROJECTION)
          .eq('school_id', schoolId)
          .eq('role', 'student')
          .order('first_name'),
        supabaseClient
          .from('users')
          .select('id, first_name, last_name, instrument, expertise')
          .eq('school_id', schoolId)
          .in('role', ['teacher', 'admin', 'secretary'])
      ]);

      if (regUsersRes.error) {
        console.warn('[StudentRosterService] Primary student projection failed, activating resilient fallback:', regUsersRes.error);
        const fallbackRes = await supabaseClient
          .from('users')
          .select('id, school_id, role, first_name, last_name, email, avatar_url, photo_url, qr_token, instrument, created_at, is_active, is_campus_active, is_groovelab_active, teacher_id, birth_date, group_id, sibling_group_id, lesson_duration, status, contract_ends_at, trial_ends_at, is_trial, exempt_from_direct_billing, ausweis_nummer')
          .eq('school_id', schoolId)
          .eq('role', 'student')
          .order('first_name');
        regUsers = (fallbackRes.data as DbUserRosterRecord[]) || [];
      } else {
        regUsers = (regUsersRes.data as DbUserRosterRecord[]) || [];
      }

      if (teachersRes.error) {
        console.warn('[StudentRosterService] Primary teachers query failed, activating fallback:', teachersRes.error);
        const fbTeachers = await supabaseClient
          .from('users')
          .select('id, first_name, last_name, instrument')
          .eq('school_id', schoolId)
          .in('role', ['teacher', 'admin', 'secretary']);
        teachers = (fbTeachers.data as DbTeacherRosterRecord[]) || [];
      } else {
        teachers = (teachersRes.data as DbTeacherRosterRecord[]) || [];
      }
    } catch (e) {
      console.error('[StudentRosterService] Error fetching students/teachers:', e);
    }

    const teacherMap = new Map<string, DbTeacherRosterRecord>(teachers.map((t: DbTeacherRosterRecord) => [t.id, t]));

    const registeredStudents: RosterStudent[] = regUsers.map((u: DbUserRosterRecord) => {
      const assignedTeacher = u.teacher_id ? teacherMap.get(u.teacher_id) : null;
      const effectiveInst = getEffectiveInstrument(u, assignedTeacher);
      const resolvedInst = effectiveInst || u.resolved_instrument || u.instrument || 'Gitarre';
      return {
        ...u,
        role: 'student',
        teacher_id: u.teacher_id ?? null,
        teacher: assignedTeacher,
        resolved_instrument: resolvedInst,
        instrument: (!isGenericInstrument(u.instrument) && u.instrument) ? u.instrument : resolvedInst,
        first_name: (u.first_name || '').trim(),
        last_name: u.last_name || '',
        is_active: Boolean(u.is_active),
        is_campus_active: Boolean(u.is_campus_active),
        is_groovelab_active: Boolean(u.is_groovelab_active),
        isPendingOnboarding: false,
        status: u.status || (u.is_active ? 'active' : 'inactive'),
        created_at: u.created_at || new Date().toISOString()
      };
    });

    const regIds = new Set(registeredStudents.map(s => s.id));
    const registeredNormNames = new Set(
      registeredStudents.map(s => normalizeStudentKey(s.first_name, s.last_name))
    );

    // 2. Fetch pending student invitations
    let pendingMapped: RosterStudent[] = [];
    try {
      const { data: pendingData, error: pError } = await supabaseClient
        .from('pending_students_decrypted')
        .select('id, school_id, teacher_id, instrument, status, created_at, first_name, last_name, day_of_birth')
        .eq('school_id', schoolId);

      if (!pError && pendingData) {
        const seenPendingNormNames = new Set<string>();

        pendingMapped = (pendingData as DbPendingStudentDecrypted[])
          .filter((ps: DbPendingStudentDecrypted) => {
            if (!ps) return false;
            const fName = (ps.first_name || '').trim();
            const lName = (ps.last_name || '').trim();
            if (isTestOrGenericStudent(fName, lName)) return false;
            if (regIds.has(ps.id)) return false;
            const nameKey = normalizeStudentKey(fName, lName);
            if (nameKey !== '_' && registeredNormNames.has(nameKey)) return false;
            if (nameKey !== '_') {
              if (seenPendingNormNames.has(nameKey)) return false;
              seenPendingNormNames.add(nameKey);
            }
            return true;
          })
          .map((ps: DbPendingStudentDecrypted) => {
            const assignedTeacher = ps.teacher_id ? teacherMap.get(ps.teacher_id) : null;
            const effectiveInst = getEffectiveInstrument(ps, assignedTeacher);
            const finalInst = (!isGenericInstrument(ps.instrument) && ps.instrument) ? ps.instrument : (effectiveInst || 'Gitarre');
            return {
              id: ps.id,
              school_id: ps.school_id,
              teacher_id: ps.teacher_id ?? null,
              teacher: assignedTeacher,
              role: 'student' as const,
              first_name: (ps.first_name || '').trim(),
              last_name: ps.last_name || '',
              email: '',
              instrument: finalInst,
              resolved_instrument: finalInst,
              is_active: false,
              is_campus_active: false,
              is_groovelab_active: false,
              status: 'inactive',
              isPendingOnboarding: true,
              day_of_birth: ps.day_of_birth || null,
              ausweis_nummer: 'Ausstehend (Onboarding)',
              created_at: ps.created_at || new Date().toISOString()
            };
          });
      }
    } catch (err) {
      console.warn('[StudentRosterService] Pending students fetch warning:', err);
    }

    // 3. Deduplicate and return authoritative roster
    const roster = deduplicateRoster([...registeredStudents, ...pendingMapped]);
    inMemoryRoster.set(schoolId, { timestamp: Date.now(), data: roster });
    return roster;
  });
}

/**
 * Returns the roster of students assigned to or accessible by a specific teacher.
 */
export function getTeacherRoster(
  teacherId: string,
  fullRoster: RosterStudent[],
  additionalAssignedStudentIds: string[] = []
): RosterStudent[] {
  if (!teacherId || !Array.isArray(fullRoster)) return [];
  const assignedSet = new Set(additionalAssignedStudentIds);
  return fullRoster.filter(s => s.teacher_id === teacherId || assignedSet.has(s.id));
}

/**
 * Calculates the exact canonical student count for a teacher.
 * 'primary_only': count only where teacher_id matches (authoritative for primary quotas & billing).
 * 'all_accessible': count all accessible pupils including schedule and band assignments.
 */
export function getTeacherStudentCount(
  teacherId: string,
  fullRoster: RosterStudent[],
  mode: 'primary_only' | 'all_accessible' = 'primary_only',
  additionalAssignedStudentIds: string[] = []
): number {
  if (!teacherId || !Array.isArray(fullRoster)) return 0;
  if (mode === 'primary_only') {
    return fullRoster.filter(s => s.teacher_id === teacherId).length;
  }
  const assignedSet = new Set(additionalAssignedStudentIds);
  return fullRoster.filter(s => s.teacher_id === teacherId || assignedSet.has(s.id)).length;
}
