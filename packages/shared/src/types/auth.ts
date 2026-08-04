/**
 * Campus-Groovelab Authentication & User Domain Models
 * Strictly type-safe interfaces without `any`
 */

export type UserRole = 'admin' | 'secretary' | 'teacher' | 'student' | 'parent';

export type ModuleType = 'campus' | 'groovelab' | 'verwaltung';

export interface BaseUserProfile {
  id: string;
  email?: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  schoolId: string;
  avatarUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProfile extends BaseUserProfile {
  role: 'admin';
  permissions: string[];
}

export interface SecretaryProfile extends BaseUserProfile {
  role: 'secretary';
  permissions: string[];
}

export interface TeacherProfile extends BaseUserProfile {
  role: 'teacher';
  instruments: string[];
  bio?: string;
  colorCode?: string;
  maxStudents?: number;
}

export interface StudentProfile extends BaseUserProfile {
  role: 'student';
  parentEmail?: string;
  instruments: string[];
  teacherId?: string;
  isActivated: boolean;
  activationDate?: string;
  lastLoginDate?: string;
  ghostAvatarId?: string;
}

export interface ParentProfile extends BaseUserProfile {
  role: 'parent';
  associatedStudentIds: string[];
}

export type UserProfile =
  | AdminProfile
  | SecretaryProfile
  | TeacherProfile
  | StudentProfile
  | ParentProfile;

export interface KioskSession {
  kioskId: string;
  schoolId: string;
  secretToken: string;
  name: string;
  lastSeenAt: string;
  isActive: boolean;
}

export interface CampusPinState {
  isLocked: boolean;
  pinHash?: string;
  unlockedUntil?: number;
}
