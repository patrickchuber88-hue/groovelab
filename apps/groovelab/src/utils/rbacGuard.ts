/**
 * ==============================================================================
 * CAMPUS-GROOVELAB ENTERPRISE RBAC & ZERO-TRUST AUTHORIZATION GUARD
 * Strictly enforces Least-Privilege Role Boundaries across all Dashboards
 * ==============================================================================
 */

export type UserRole = 'admin' | 'secretary' | 'teacher' | 'student' | 'master_admin';

export interface UserContext {
  id: string;
  school_id?: string | null;
  role?: string | null;
  is_master_admin?: boolean | null;
}

export function isMasterAdmin(user: UserContext | null | undefined): boolean {
  return Boolean(user?.is_master_admin || user?.role === 'master_admin');
}

export function isAdmin(user: UserContext | null | undefined): boolean {
  if (!user) return false;
  return isMasterAdmin(user) || user.role === 'admin';
}

export function isSecretary(user: UserContext | null | undefined): boolean {
  if (!user) return false;
  return isMasterAdmin(user) || user.role === 'admin' || user.role === 'secretary';
}

export function isTeacher(user: UserContext | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'teacher';
}

export function isStudent(user: UserContext | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'student' || (!user.role && !isAdmin(user) && !isSecretary(user));
}

/**
 * Checks if user has privileges to manage room confirmations, schedules, and invoices.
 */
export function canManageSchoolAdministration(user: UserContext | null | undefined): boolean {
  return isSecretary(user);
}

/**
 * Checks if user is restricted from having musician/band avatars (Administration & Secretariat Rule).
 */
export function isAdministrationAvatarRestricted(user: UserContext | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'secretary' || Boolean(user.is_master_admin);
}

/**
 * Gets the standard hero picture URL for administration/secretariat users.
 */
export function getAdministrationHeroImage(): string {
  return '/campus_login_hero.png';
}
